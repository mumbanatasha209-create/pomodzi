use crate::{
    auth::AuthUser,
    error::{AppError, AppResult},
    handlers::{
        get_user_signing_secret, group_lock_key, groups::is_active_member,
        notify, payouts, write_audit,
    },
    models::{Contribution, ContributeRequest, SavingsGroup, parse_money},
    security::validate_contribution_amount,
    state::AppState,
};
use axum::{
    extract::{Path, State},
    Json,
};
use rust_decimal::Decimal;
use serde_json::{json, Value};
use sqlx::{Postgres, Transaction};
use uuid::Uuid;

const GROUP_SELECT: &str = r#"SELECT id, name, description, admin_id, contribution_amount, currency,
       frequency::text AS frequency, current_cycle, status::text AS status,
       invite_code, treasury_public_key, treasury_secret_key, created_at, updated_at
       FROM savings_groups WHERE id = $1"#;

/// POST /api/groups/:id/contribute
pub async fn contribute(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(group_id): Path<Uuid>,
    Json(payload): Json<ContributeRequest>,
) -> AppResult<Json<Value>> {
    if !is_active_member(&state.db, group_id, auth.user_id).await? {
        return Err(AppError::Forbidden);
    }

    let amount = parse_money(&payload.amount)
        .map_err(|m| AppError::BadRequest(m))?;

    let group = sqlx::query_as::<_, SavingsGroup>(GROUP_SELECT)
        .bind(group_id)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| AppError::NotFound("Group not found".into()))?;

    if group.status != "active" {
        return Err(AppError::BadRequest("Group is not active".into()));
    }

    validate_contribution_amount(&amount, &group.contribution_amount)?;

    let cycle = group.current_cycle;

    let mut tx = state.db.begin().await?;
    sqlx::query("SELECT pg_advisory_xact_lock($1)")
        .bind(group_lock_key(group_id))
        .execute(&mut *tx)
        .await?;

    let locked_group = sqlx::query_as::<_, SavingsGroup>(GROUP_SELECT)
        .bind(group_id)
        .fetch_one(&mut *tx)
        .await?;

    if locked_group.current_cycle != cycle {
        return Err(AppError::Conflict(
            "Cycle changed while processing contribution. Please retry.".into(),
        ));
    }

    let existing = sqlx::query_scalar::<_, Option<String>>(
        r#"SELECT status::text FROM contributions
           WHERE group_id = $1 AND user_id = $2 AND cycle = $3"#,
    )
    .bind(group_id)
    .bind(auth.user_id)
    .bind(cycle)
    .fetch_optional(&mut *tx)
    .await?;
    if matches!(existing, Some(Some(ref s)) if s == "paid") {
        return Err(AppError::Conflict(
            "You have already contributed this cycle".into(),
        ));
    }

    let treasury_public = locked_group
        .treasury_public_key
        .clone()
        .ok_or_else(|| AppError::BadRequest("Group treasury wallet is not provisioned".into()))?;

    let (_user, member_secret) =
        get_user_signing_secret(&state.db, &state.crypto, auth.user_id).await?;

    let payment = state
        .stellar
        .send_native_payment(&member_secret, &treasury_public, &amount)
        .await
        .map_err(|e| AppError::BadRequest(format!("Stellar payment failed: {e}")))?;

    if !state.stellar.verify_transaction(&payment.hash).await.unwrap_or(false) {
        return Err(AppError::BadRequest(
            "Stellar payment could not be verified on testnet".into(),
        ));
    }

    let contribution = insert_confirmed_contribution(
        &mut tx,
        group_id,
        auth.user_id,
        cycle,
        &amount,
        &payment.hash,
    )
    .await?;

    sqlx::query(
        r#"INSERT INTO transactions (user_id, group_id, tx_type, amount, status, blockchain_hash,
           transaction_source, memo)
           VALUES ($1, $2, 'contribution', $3, 'success', $4, 'stellar_testnet', $5)"#,
    )
    .bind(auth.user_id)
    .bind(group_id)
    .bind(&amount)
    .bind(&payment.hash)
    .bind(format!(
        "Contribution to {} (cycle {})",
        locked_group.name, cycle
    ))
    .execute(&mut *tx)
    .await?;

    let total = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM group_members WHERE group_id = $1 AND status = 'active'",
    )
    .bind(group_id)
    .fetch_one(&mut *tx)
    .await?;

    let paid = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM contributions
           WHERE group_id = $1 AND cycle = $2 AND status = 'paid'"#,
    )
    .bind(group_id)
    .bind(cycle)
    .fetch_one(&mut *tx)
    .await?;

    let mut payout_triggered = false;
    if total > 0 && paid >= total {
        payouts::process_payout_in_tx(&state, &mut tx, &locked_group).await?;
        payout_triggered = true;
    }

    tx.commit().await?;

    write_audit(
        &state.db,
        Some(auth.user_id),
        "contribution.paid",
        "group",
        Some(group_id.to_string()),
        json!({ "cycle": cycle, "blockchain_hash": payment.hash }),
    )
    .await;

    notify(
        &state.db,
        locked_group.admin_id,
        "Contribution received",
        &format!("{} paid their contribution for cycle {}.", auth.email, cycle),
    )
    .await;

    Ok(Json(json!({
        "contribution": contribution,
        "all_paid": total > 0 && paid >= total,
        "payout_triggered": payout_triggered,
    })))
}

async fn insert_confirmed_contribution(
    tx: &mut Transaction<'_, Postgres>,
    group_id: Uuid,
    user_id: Uuid,
    cycle: i32,
    amount: &Decimal,
    blockchain_hash: &str,
) -> AppResult<Contribution> {
    let contribution = sqlx::query_as::<_, Contribution>(
        r#"INSERT INTO contributions (group_id, user_id, cycle, amount, status, blockchain_hash,
           transaction_source, paid_at)
           VALUES ($1, $2, $3, $4, 'paid', $5, 'stellar_testnet', now())
           ON CONFLICT (group_id, user_id, cycle)
           DO UPDATE SET status = 'paid', amount = EXCLUDED.amount,
                         blockchain_hash = EXCLUDED.blockchain_hash,
                         transaction_source = EXCLUDED.transaction_source,
                         paid_at = now()
           RETURNING id, group_id, user_id, cycle, amount, status::text AS status,
                     blockchain_hash, transaction_source::text AS transaction_source,
                     paid_at, created_at"#,
    )
    .bind(group_id)
    .bind(user_id)
    .bind(cycle)
    .bind(amount)
    .bind(blockchain_hash)
    .fetch_one(&mut **tx)
    .await?;

    Ok(contribution)
}

/// GET /api/groups/:id/contributions
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
                  blockchain_hash, transaction_source::text AS transaction_source,
                  paid_at, created_at
           FROM contributions WHERE group_id = $1
           ORDER BY cycle DESC, created_at DESC"#,
    )
    .bind(group_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(rows))
}
