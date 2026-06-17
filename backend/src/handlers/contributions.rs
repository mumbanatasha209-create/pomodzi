use crate::{
    auth::AuthUser,
    error::{AppError, AppResult},
    handlers::{
        get_user, get_user_signing_secret, group_lock_key, groups::is_active_member,
        notify, payouts, write_audit,
    },
    models::{Contribution, ContributeRequest, SavingsGroup, CONTRIBUTION_COLUMNS, parse_money},
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

use crate::models::GROUP_SELECT_BY_ID as GROUP_SELECT;

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
    let contributor = get_user(&state.db, auth.user_id).await?;

    let payment_provider = payload
        .payment_provider
        .as_deref()
        .unwrap_or("stellar_wallet");
    let payment_country = contributor
        .as_ref()
        .and_then(|u| u.country.clone())
        .or_else(|| locked_group.primary_country.clone());
    let cross_border = contributor
        .as_ref()
        .and_then(|u| u.country.as_deref())
        .zip(locked_group.primary_country.as_deref())
        .map(|(a, b)| a != b)
        .unwrap_or(false);
    let original_currency = locked_group.currency.clone();
    let settlement_currency = locked_group.settlement_asset.clone();

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
        &original_currency,
        &settlement_currency,
        payment_provider,
        payment_country.as_deref(),
    )
    .await?;

    let tx_type = if cross_border {
        "cross_border_contribution"
    } else {
        "contribution"
    };

    sqlx::query(
        r#"INSERT INTO transactions (user_id, group_id, tx_type, amount, currency, status, blockchain_hash,
           transaction_source, memo)
           VALUES ($1, $2, $3::tx_type, $4, $5, 'success', $6, 'stellar_testnet', $7)"#,
    )
    .bind(auth.user_id)
    .bind(group_id)
    .bind(tx_type)
    .bind(&amount)
    .bind(&original_currency)
    .bind(&payment.hash)
    .bind(format!(
        "Group Contribution to {} (cycle {})",
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
        auth.user_id,
        "Contribution received",
        "Your contribution was received.",
    )
    .await;

    notify(
        &state.db,
        locked_group.admin_id,
        "Treasury deposit",
        &format!("Treasury received a contribution for cycle {}.", cycle),
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
    original_currency: &str,
    settlement_currency: &str,
    payment_provider: &str,
    payment_country: Option<&str>,
) -> AppResult<Contribution> {
    let insert = format!(
        r#"INSERT INTO contributions (group_id, user_id, cycle, amount, status, blockchain_hash,
           transaction_source, paid_at, original_currency, settlement_currency, payment_provider,
           payment_country)
           VALUES ($1, $2, $3, $4, 'paid', $5, 'stellar_testnet', now(), $6, $7, $8, $9)
           ON CONFLICT (group_id, user_id, cycle)
           DO UPDATE SET status = 'paid', amount = EXCLUDED.amount,
                         blockchain_hash = EXCLUDED.blockchain_hash,
                         transaction_source = EXCLUDED.transaction_source,
                         paid_at = now(),
                         original_currency = EXCLUDED.original_currency,
                         settlement_currency = EXCLUDED.settlement_currency,
                         payment_provider = EXCLUDED.payment_provider,
                         payment_country = EXCLUDED.payment_country
           RETURNING {CONTRIBUTION_COLUMNS}"#
    );

    let contribution = sqlx::query_as::<_, Contribution>(&insert)
    .bind(group_id)
    .bind(user_id)
    .bind(cycle)
    .bind(amount)
    .bind(blockchain_hash)
    .bind(original_currency)
    .bind(settlement_currency)
    .bind(payment_provider)
    .bind(payment_country)
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
        &format!("SELECT {CONTRIBUTION_COLUMNS} FROM contributions WHERE group_id = $1 ORDER BY cycle DESC, created_at DESC"),
    )
    .bind(group_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(rows))
}
