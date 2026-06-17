use crate::{
    auth::AuthUser,
    error::{AppError, AppResult},
    handlers::{encrypt_secret, generate_invite_code, get_user, notify, write_audit},
    international::{
        default_timezone_for_country, validate_country, validate_currency,
        validate_settlement_asset,
    },
    models::{
        AddMemberRequest, CreateGroupRequest, GroupMember, JoinGroupRequest, MemberView,
        SavingsGroup, SetRotationRequest, User, GROUP_COLUMNS, GROUP_SELECT, USER_COLUMNS, parse_money,
    },
    state::AppState,
    stellar::StellarClient,
};
use axum::{
    extract::{Path, State},
    Json,
};
use rust_decimal::Decimal;
use serde_json::{json, Value};
use sqlx::PgPool;
use uuid::Uuid;

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
    let query = format!("{GROUP_SELECT} WHERE id = $1");
    sqlx::query_as::<_, SavingsGroup>(&query)
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

    let contribution_amount = parse_money(&payload.contribution_amount)
        .map_err(|m| AppError::BadRequest(m))?;
    if contribution_amount <= Decimal::ZERO {
        return Err(AppError::BadRequest(
            "Contribution amount must be greater than zero".into(),
        ));
    }

    let primary_country = payload
        .primary_country
        .as_deref()
        .map(validate_country)
        .transpose()?;
    let currency = validate_currency(
        payload
            .currency
            .as_deref()
            .unwrap_or("XLM"),
    )?;
    let settlement_asset = validate_settlement_asset(
        payload
            .settlement_asset
            .as_deref()
            .unwrap_or("XLM"),
    )?;
    let timezone = payload
        .timezone
        .as_deref()
        .map(|t| t.to_string())
        .or_else(|| {
            primary_country
                .as_deref()
                .map(default_timezone_for_country)
                .map(str::to_string)
        })
        .unwrap_or_else(|| "UTC".to_string());

    let treasury = StellarClient::generate_keypair();
    let encrypted_treasury_secret = encrypt_secret(&state.crypto, &treasury.secret_key)?;
    let invite_code = generate_invite_code();

    let insert = format!(
        r#"INSERT INTO savings_groups
              (name, description, admin_id, contribution_amount, currency, frequency, invite_code,
               treasury_public_key, treasury_secret_key, primary_country, settlement_asset, timezone)
           VALUES ($1, $2, $3, $4, $5, $6::contribution_frequency, $7, $8, $9, $10, $11, $12)
           RETURNING {GROUP_COLUMNS}"#
    );

    let group = sqlx::query_as::<_, SavingsGroup>(&insert)
        .bind(payload.name.trim())
        .bind(payload.description.as_deref())
        .bind(auth.user_id)
        .bind(contribution_amount)
        .bind(&currency)
        .bind(&payload.frequency)
        .bind(&invite_code)
        .bind(&treasury.public_key)
        .bind(&encrypted_treasury_secret)
        .bind(primary_country.as_deref())
        .bind(&settlement_asset)
        .bind(&timezone)
        .fetch_one(&state.db)
        .await?;

    if let Err(e) = state.stellar.fund_with_friendbot(&treasury.public_key).await {
        tracing::warn!("treasury friendbot funding failed: {e}");
    }

    sqlx::query(
        r#"INSERT INTO group_members (group_id, user_id, rotation_order)
           VALUES ($1, $2, 1)"#,
    )
    .bind(group.id)
    .bind(auth.user_id)
    .execute(&state.db)
    .await?;

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

/// GET /api/groups
pub async fn list_my_groups(
    State(state): State<AppState>,
    auth: AuthUser,
) -> AppResult<Json<Vec<Value>>> {
    let rows = sqlx::query_as::<_, SavingsGroup>(
        r#"SELECT g.id, g.name, g.description, g.admin_id, g.contribution_amount, g.currency,
                  g.frequency::text AS frequency, g.current_cycle, g.status::text AS status,
                  g.invite_code, g.treasury_public_key, g.treasury_secret_key,
                  g.primary_country, g.settlement_asset, g.timezone,
                  g.created_at, g.updated_at
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

/// GET /api/groups/:id
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
    let group = sqlx::query_as::<_, SavingsGroup>(&format!(
        "{GROUP_SELECT} WHERE invite_code = $1"
    ))
    .bind(payload.invite_code.trim().to_uppercase())
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Invalid invite code".into()))?;

    if is_active_member(&state.db, group.id, auth.user_id).await? {
        return Err(AppError::Conflict("You are already a member".into()));
    }

    let joiner = get_user(&state.db, auth.user_id).await?;
    add_member_internal(&state.db, group.id, auth.user_id).await?;

    let cross_border = joiner
        .as_ref()
        .and_then(|u| u.country.as_deref())
        .zip(group.primary_country.as_deref())
        .map(|(a, b)| a != b)
        .unwrap_or(false);

    if cross_border {
        notify(
            &state.db,
            group.admin_id,
            "Cross-border member",
            "A member from another country joined your savings circle.",
        )
        .await;
    } else {
        notify(
            &state.db,
            group.admin_id,
            "New member",
            &format!("{} joined your savings circle \"{}\".", auth.email, group.name),
        )
        .await;
    }

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

/// POST /api/groups/:id/members
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

    let query = format!("SELECT {USER_COLUMNS} FROM users WHERE email = $1");
    let target = sqlx::query_as::<_, User>(&query)
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
        "Added to savings circle",
        &format!("You were added to the savings circle \"{}\".", group.name),
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

/// PUT /api/groups/:id/rotation
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
