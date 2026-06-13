use crate::{
    auth::AuthUser,
    error::{AppError, AppResult},
    handlers::{groups::is_active_member, notify, payouts, write_audit},
    models::{Contribution, ContributeRequest, SavingsGroup},
    state::AppState,
};
use axum::{
    extract::{Path, State},
    Json,
};
use serde_json::{json, Value};
use uuid::Uuid;

/// POST /api/groups/:id/contribute
/// Records the caller's contribution for the current cycle. When every active
/// member has paid, a payout is automatically triggered (see `payouts`).
pub async fn contribute(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(group_id): Path<Uuid>,
    Json(payload): Json<ContributeRequest>,
) -> AppResult<Json<Value>> {
    if !is_active_member(&state.db, group_id, auth.user_id).await? {
        return Err(AppError::Forbidden);
    }

    let group = sqlx::query_as::<_, SavingsGroup>(
        r#"SELECT id, name, description, admin_id, contribution_amount, currency,
                  frequency::text AS frequency, current_cycle, status::text AS status,
                  invite_code, created_at, updated_at
           FROM savings_groups WHERE id = $1"#,
    )
    .bind(group_id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::NotFound("Group not found".into()))?;

    if group.status != "active" {
        return Err(AppError::BadRequest("Group is not active".into()));
    }

    let cycle = group.current_cycle;

    // Already paid this cycle?
    let existing = sqlx::query_scalar::<_, Option<String>>(
        r#"SELECT status::text FROM contributions
           WHERE group_id = $1 AND user_id = $2 AND cycle = $3"#,
    )
    .bind(group_id)
    .bind(auth.user_id)
    .bind(cycle)
    .fetch_optional(&state.db)
    .await?;
    if matches!(existing, Some(Some(ref s)) if s == "paid") {
        return Err(AppError::Conflict(
            "You have already contributed this cycle".into(),
        ));
    }

    // Simulated on-chain reference for the contribution (testnet demo ledger).
    let tx_ref = format!("contrib-{}", Uuid::new_v4().simple());

    // Upsert the contribution as paid.
    let contribution = sqlx::query_as::<_, Contribution>(
        r#"INSERT INTO contributions (group_id, user_id, cycle, amount, status, stellar_tx_hash, paid_at)
           VALUES ($1, $2, $3, COALESCE($4::numeric, (SELECT contribution_amount FROM savings_groups WHERE id = $1)), 'paid', $5, now())
           ON CONFLICT (group_id, user_id, cycle)
           DO UPDATE SET status = 'paid', stellar_tx_hash = EXCLUDED.stellar_tx_hash, paid_at = now()
           RETURNING id, group_id, user_id, cycle, amount, status::text AS status,
                     stellar_tx_hash, paid_at, created_at"#,
    )
    .bind(group_id)
    .bind(auth.user_id)
    .bind(cycle)
    .bind(payload.amount)
    .bind(&tx_ref)
    .fetch_one(&state.db)
    .await?;

    // Record in transaction history.
    sqlx::query(
        r#"INSERT INTO transactions (user_id, group_id, tx_type, amount, status, stellar_tx_hash, memo)
           VALUES ($1, $2, 'contribution', $3::numeric, 'success', $4, $5)"#,
    )
    .bind(auth.user_id)
    .bind(group_id)
    .bind(&contribution.amount)
    .bind(&tx_ref)
    .bind(format!("Contribution to {} (cycle {})", group.name, cycle))
    .execute(&state.db)
    .await?;

    write_audit(
        &state.db,
        Some(auth.user_id),
        "contribution.paid",
        "group",
        Some(group_id.to_string()),
        json!({ "cycle": cycle }),
    )
    .await;

    notify(
        &state.db,
        group.admin_id,
        "Contribution received",
        &format!("{} paid their contribution for cycle {}.", auth.email, cycle),
    )
    .await;

    // Check whether every active member has now paid.
    let total = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM group_members WHERE group_id = $1 AND status = 'active'",
    )
    .bind(group_id)
    .fetch_one(&state.db)
    .await?;

    let paid = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM contributions
           WHERE group_id = $1 AND cycle = $2 AND status = 'paid'"#,
    )
    .bind(group_id)
    .bind(cycle)
    .fetch_one(&state.db)
    .await?;

    let mut payout_triggered = false;
    if total > 0 && paid >= total {
        payouts::process_payout(&state, &group).await?;
        payout_triggered = true;
    }

    Ok(Json(json!({
        "contribution": contribution,
        "all_paid": total > 0 && paid >= total,
        "payout_triggered": payout_triggered,
    })))
}

/// GET /api/groups/:id/contributions — current cycle contributions.
pub async fn list_contributions(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(group_id): Path<Uuid>,
) -> AppResult<Json<Vec<Contribution>>> {
    if !is_active_member(&state.db, group_id, auth.user_id).await? && !auth.is_platform_admin() {
        return Err(AppError::Forbidden);
    }

    let rows = sqlx::query_as::<_, Contribution>(
        r#"SELECT id, group_id, user_id, cycle, amount, status::text AS status,
                  stellar_tx_hash, paid_at, created_at
           FROM contributions WHERE group_id = $1
           ORDER BY cycle DESC, created_at DESC"#,
    )
    .bind(group_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(rows))
}
