use crate::{
    auth::AuthUser,
    error::{AppError, AppResult},
    handlers::{generate_invite_code, notify, write_audit},
    models::{
        AddMemberRequest, CreateGroupRequest, GroupMember, JoinGroupRequest, MemberView,
        SavingsGroup, SetRotationRequest, User,
    },
    state::AppState,
};
use axum::{
    extract::{Path, State},
    Json,
};
use serde_json::{json, Value};
use sqlx::PgPool;
use uuid::Uuid;

// -------------------------- membership helpers --------------------------

pub async fn is_active_member(db: &PgPool, group_id: Uuid, user_id: Uuid) -> AppResult<bool> {
    let count = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM group_members WHERE group_id = $1 AND user_id = $2 AND status = 'active'",
    )
    .bind(group_id)
    .bind(user_id)
    .fetch_one(db)
    .await?;
    Ok(count > 0)
}

async fn load_group(db: &PgPool, group_id: Uuid) -> AppResult<SavingsGroup> {
    sqlx::query_as::<_, SavingsGroup>(
        r#"SELECT id, name, description, admin_id, contribution_amount, currency,
                  frequency::text AS frequency, current_cycle, status::text AS status,
                  invite_code, created_at, updated_at
           FROM savings_groups WHERE id = $1"#,
    )
    .bind(group_id)
    .fetch_optional(db)
    .await?
    .ok_or_else(|| AppError::NotFound("Group not found".into()))
}

async fn members_view(db: &PgPool, group_id: Uuid, cycle: i32) -> AppResult<Vec<MemberView>> {
    let members = sqlx::query_as::<_, MemberView>(
        r#"SELECT gm.user_id, u.full_name, u.email, gm.rotation_order,
                  gm.has_received_payout, u.stellar_public_key,
                  COALESCE(c.status::text, 'pending') AS contribution_status
           FROM group_members gm
           JOIN users u ON u.id = gm.user_id
           LEFT JOIN contributions c
             ON c.group_id = gm.group_id AND c.user_id = gm.user_id AND c.cycle = $2
           WHERE gm.group_id = $1 AND gm.status = 'active'
           ORDER BY gm.rotation_order ASC, gm.joined_at ASC"#,
    )
    .bind(group_id)
    .bind(cycle)
    .fetch_all(db)
    .await?;
    Ok(members)
}

// ------------------------------- handlers -------------------------------

/// POST /api/groups
pub async fn create_group(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<CreateGroupRequest>,
) -> AppResult<Json<SavingsGroup>> {
    if payload.name.trim().is_empty() {
        return Err(AppError::BadRequest("Group name is required".into()));
    }
    if payload.frequency != "weekly" && payload.frequency != "monthly" {
        return Err(AppError::BadRequest(
            "Frequency must be 'weekly' or 'monthly'".into(),
        ));
    }
    if payload.contribution_amount <= 0.0 {
        return Err(AppError::BadRequest(
            "Contribution amount must be greater than zero".into(),
        ));
    }

    let invite_code = generate_invite_code();

    let group = sqlx::query_as::<_, SavingsGroup>(
        r#"INSERT INTO savings_groups
              (name, description, admin_id, contribution_amount, frequency, invite_code)
           VALUES ($1, $2, $3, $4::numeric, $5::contribution_frequency, $6)
           RETURNING id, name, description, admin_id, contribution_amount, currency,
                     frequency::text AS frequency, current_cycle, status::text AS status,
                     invite_code, created_at, updated_at"#,
    )
    .bind(payload.name.trim())
    .bind(payload.description.as_deref())
    .bind(auth.user_id)
    .bind(payload.contribution_amount)
    .bind(&payload.frequency)
    .bind(&invite_code)
    .fetch_one(&state.db)
    .await?;

    // Add the creator as the first member (rotation order 1).
    sqlx::query(
        r#"INSERT INTO group_members (group_id, user_id, rotation_order)
           VALUES ($1, $2, 1)"#,
    )
    .bind(group.id)
    .bind(auth.user_id)
    .execute(&state.db)
    .await?;

    // Promote a plain member to group_admin (platform_admin stays as-is).
    sqlx::query("UPDATE users SET role = 'group_admin'::user_role WHERE id = $1 AND role = 'member'::user_role")
        .bind(auth.user_id)
        .execute(&state.db)
        .await?;

    write_audit(
        &state.db,
        Some(auth.user_id),
        "group.create",
        "group",
        Some(group.id.to_string()),
        json!({ "name": group.name, "invite_code": invite_code }),
    )
    .await;

    Ok(Json(group))
}

/// GET /api/groups  — groups the user belongs to.
pub async fn list_my_groups(
    State(state): State<AppState>,
    auth: AuthUser,
) -> AppResult<Json<Vec<Value>>> {
    let rows = sqlx::query_as::<_, SavingsGroup>(
        r#"SELECT g.id, g.name, g.description, g.admin_id, g.contribution_amount, g.currency,
                  g.frequency::text AS frequency, g.current_cycle, g.status::text AS status,
                  g.invite_code, g.created_at, g.updated_at
           FROM savings_groups g
           JOIN group_members gm ON gm.group_id = g.id
           WHERE gm.user_id = $1 AND gm.status = 'active'
           ORDER BY g.created_at DESC"#,
    )
    .bind(auth.user_id)
    .fetch_all(&state.db)
    .await?;

    let mut out = Vec::with_capacity(rows.len());
    for g in rows {
        let member_count = sqlx::query_scalar::<_, i64>(
            "SELECT COUNT(*) FROM group_members WHERE group_id = $1 AND status = 'active'",
        )
        .bind(g.id)
        .fetch_one(&state.db)
        .await?;
        let is_admin = g.admin_id == auth.user_id;
        out.push(json!({
            "group": g,
            "member_count": member_count,
            "is_admin": is_admin,
        }));
    }
    Ok(Json(out))
}

/// GET /api/groups/:id — full detail (members, cycle status).
pub async fn get_group(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(group_id): Path<Uuid>,
) -> AppResult<Json<Value>> {
    let group = load_group(&state.db, group_id).await?;

    if !is_active_member(&state.db, group_id, auth.user_id).await? && !auth.is_platform_admin() {
        return Err(AppError::Forbidden);
    }

    let members = members_view(&state.db, group_id, group.current_cycle).await?;
    let paid = members
        .iter()
        .filter(|m| m.contribution_status == "paid")
        .count();
    let total = members.len();

    let is_admin = group.admin_id == auth.user_id;

    Ok(Json(json!({
        "group": group,
        "members": members,
        "paid_count": paid,
        "total_members": total,
        "all_paid": total > 0 && paid == total,
        "is_admin": is_admin,
    })))
}

/// POST /api/groups/join
pub async fn join_group(
    State(state): State<AppState>,
    auth: AuthUser,
    Json(payload): Json<JoinGroupRequest>,
) -> AppResult<Json<SavingsGroup>> {
    let group = sqlx::query_as::<_, SavingsGroup>(
        r#"SELECT id, name, description, admin_id, contribution_amount, currency,
                  frequency::text AS frequency, current_cycle, status::text AS status,
                  invite_code, created_at, updated_at
           FROM savings_groups WHERE invite_code = $1"#,
    )
    .bind(payload.invite_code.trim().to_uppercase())
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Invalid invite code".into()))?;

    if is_active_member(&state.db, group.id, auth.user_id).await? {
        return Err(AppError::Conflict("You are already a member".into()));
    }

    add_member_internal(&state.db, group.id, auth.user_id).await?;

    notify(
        &state.db,
        group.admin_id,
        "New member joined",
        &format!("{} joined your group \"{}\".", auth.email, group.name),
    )
    .await;

    write_audit(
        &state.db,
        Some(auth.user_id),
        "group.join",
        "group",
        Some(group.id.to_string()),
        json!({ "invite_code": group.invite_code }),
    )
    .await;

    Ok(Json(group))
}

/// POST /api/groups/:id/members  (group admin only)
pub async fn add_member(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(group_id): Path<Uuid>,
    Json(payload): Json<AddMemberRequest>,
) -> AppResult<Json<GroupMember>> {
    let group = load_group(&state.db, group_id).await?;
    if group.admin_id != auth.user_id && !auth.is_platform_admin() {
        return Err(AppError::Forbidden);
    }

    let target = sqlx::query_as::<_, User>(
        r#"SELECT id, full_name, email, phone, password_hash, role::text AS role,
                  stellar_public_key, stellar_secret_key, created_at, updated_at
           FROM users WHERE email = $1"#,
    )
    .bind(payload.email.trim().to_lowercase())
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("No user with that email. Ask them to register first.".into()))?;

    if is_active_member(&state.db, group_id, target.id).await? {
        return Err(AppError::Conflict("User is already a member".into()));
    }

    let member = add_member_internal(&state.db, group_id, target.id).await?;

    notify(
        &state.db,
        target.id,
        "Added to a savings group",
        &format!("You were added to \"{}\".", group.name),
    )
    .await;

    write_audit(
        &state.db,
        Some(auth.user_id),
        "group.add_member",
        "group",
        Some(group_id.to_string()),
        json!({ "added_user": target.id }),
    )
    .await;

    Ok(Json(member))
}

/// PUT /api/groups/:id/rotation  (group admin only)
pub async fn set_rotation(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(group_id): Path<Uuid>,
    Json(payload): Json<SetRotationRequest>,
) -> AppResult<Json<Vec<MemberView>>> {
    let group = load_group(&state.db, group_id).await?;
    if group.admin_id != auth.user_id && !auth.is_platform_admin() {
        return Err(AppError::Forbidden);
    }

    let mut tx = state.db.begin().await?;
    for item in &payload.order {
        sqlx::query(
            "UPDATE group_members SET rotation_order = $1 WHERE group_id = $2 AND user_id = $3",
        )
        .bind(item.rotation_order)
        .bind(group_id)
        .bind(item.user_id)
        .execute(&mut *tx)
        .await?;
    }
    tx.commit().await?;

    write_audit(
        &state.db,
        Some(auth.user_id),
        "group.set_rotation",
        "group",
        Some(group_id.to_string()),
        json!({ "order": payload.order.len() }),
    )
    .await;

    let members = members_view(&state.db, group_id, group.current_cycle).await?;
    Ok(Json(members))
}

/// Insert a member with the next available rotation order.
async fn add_member_internal(
    db: &PgPool,
    group_id: Uuid,
    user_id: Uuid,
) -> AppResult<GroupMember> {
    let next_order = sqlx::query_scalar::<_, Option<i32>>(
        "SELECT MAX(rotation_order) FROM group_members WHERE group_id = $1",
    )
    .bind(group_id)
    .fetch_one(db)
    .await?
    .unwrap_or(0)
        + 1;

    let member = sqlx::query_as::<_, GroupMember>(
        r#"INSERT INTO group_members (group_id, user_id, rotation_order)
           VALUES ($1, $2, $3)
           RETURNING id, group_id, user_id, rotation_order, status::text AS status,
                     has_received_payout, joined_at"#,
    )
    .bind(group_id)
    .bind(user_id)
    .bind(next_order)
    .fetch_one(db)
    .await?;

    Ok(member)
}
