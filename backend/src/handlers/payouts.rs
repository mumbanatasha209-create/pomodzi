use crate::{
    auth::AuthUser,
    error::{AppError, AppResult},
    handlers::{
        get_group_treasury_secret, get_user, groups::is_active_member, notify, write_audit,
    },
    models::{Payout, SavingsGroup, PAYOUT_COLUMNS},
    state::AppState,
};
use axum::{
    extract::{Path, State},
    Json,
};
use rust_decimal::Decimal;
use serde_json::json;
use sqlx::{Postgres, Transaction};
use uuid::Uuid;

/// Process payout inside an existing DB transaction (caller holds advisory lock).
pub async fn process_payout_in_tx(
    state: &AppState,
    tx: &mut Transaction<'_, Postgres>,
    group: &SavingsGroup,
) -> AppResult<Payout> {
    let cycle = group.current_cycle;

    let already = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM payouts WHERE group_id = $1 AND cycle = $2",
    )
    .bind(group.id)
    .bind(cycle)
    .fetch_one(&mut **tx)
    .await?;
    if already > 0 {
        return Err(AppError::Conflict("Payout already processed for this cycle".into()));
    }

    let recipient = sqlx::query_as::<_, (Uuid, Option<String>)>(
        r#"SELECT gm.user_id, u.stellar_public_key
           FROM group_members gm
           JOIN users u ON u.id = gm.user_id
           WHERE gm.group_id = $1 AND gm.status = 'active' AND gm.has_received_payout = false
           ORDER BY gm.rotation_order ASC, gm.joined_at ASC
           LIMIT 1"#,
    )
    .bind(group.id)
    .fetch_optional(&mut **tx)
    .await?
    .ok_or_else(|| AppError::BadRequest("All members have already received a payout".into()))?;

    let recipient_id = recipient.0;
    let recipient_public = recipient.1.ok_or_else(|| {
        AppError::BadRequest("Recipient does not have a Stellar wallet".into())
    })?;

    let amount: Decimal = sqlx::query_scalar::<_, Decimal>(
        r#"SELECT COALESCE(SUM(amount), 0) FROM contributions
           WHERE group_id = $1 AND cycle = $2 AND status = 'paid'"#,
    )
    .bind(group.id)
    .bind(cycle)
    .fetch_one(&mut **tx)
    .await?;

    if amount <= Decimal::ZERO {
        return Err(AppError::BadRequest("No contributions to pay out".into()));
    }

    let (treasury_public, treasury_secret) =
        get_group_treasury_secret(&state.db, &state.crypto, group.id).await?;

    let payment = state
        .stellar
        .send_native_payment(&treasury_secret, &recipient_public, &amount)
        .await
        .map_err(|e| AppError::BadRequest(format!("Stellar payout failed: {e}")))?;

    if !state
        .stellar
        .verify_transaction(&payment.hash)
        .await
        .unwrap_or(false)
    {
        return Err(AppError::BadRequest(
            "Stellar payout could not be verified on testnet".into(),
        ));
    }

    let recipient_user = get_user(&state.db, recipient_id).await?;
    let payout_country = recipient_user
        .as_ref()
        .and_then(|u| u.country.clone())
        .or_else(|| group.primary_country.clone());

    let insert = format!(
        r#"INSERT INTO payouts (group_id, cycle, recipient_id, amount, status, blockchain_hash,
           transaction_source, paid_at, payout_country, payout_provider, original_currency,
           settlement_currency)
           VALUES ($1, $2, $3, $4, 'completed', $5, 'stellar_testnet', now(), $6, 'stellar_wallet',
                   $7, $8)
           RETURNING {PAYOUT_COLUMNS}"#
    );

    let payout = sqlx::query_as::<_, Payout>(&insert)
    .bind(group.id)
    .bind(cycle)
    .bind(recipient_id)
    .bind(&amount)
    .bind(&payment.hash)
    .bind(payout_country.as_deref())
    .bind(&group.currency)
    .bind(&group.settlement_asset)
    .fetch_one(&mut **tx)
    .await
    .map_err(|e| match e {
        sqlx::Error::Database(db_err) if db_err.constraint().is_some() => {
            AppError::Conflict("Payout already processed for this cycle".into())
        }
        other => AppError::Database(other),
    })?;

    sqlx::query(
        "UPDATE group_members SET has_received_payout = true WHERE group_id = $1 AND user_id = $2",
    )
    .bind(group.id)
    .bind(recipient_id)
    .execute(&mut **tx)
    .await?;

    sqlx::query(
        r#"INSERT INTO transactions (user_id, group_id, tx_type, amount, currency, status, blockchain_hash,
           transaction_source, memo)
           VALUES ($1, $2, 'payout'::tx_type, $3, $4, 'success', $5, 'stellar_testnet', $6)"#,
    )
    .bind(recipient_id)
    .bind(group.id)
    .bind(&amount)
    .bind(&group.currency)
    .bind(&payment.hash)
    .bind(format!("Rotating Payout from {} (cycle {})", group.name, cycle))
    .execute(&mut **tx)
    .await?;

    let remaining = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM group_members
           WHERE group_id = $1 AND status = 'active' AND has_received_payout = false"#,
    )
    .bind(group.id)
    .fetch_one(&mut **tx)
    .await?;

    if remaining == 0 {
        sqlx::query("UPDATE savings_groups SET status = 'completed', updated_at = now() WHERE id = $1")
            .bind(group.id)
            .execute(&mut **tx)
            .await?;
    } else {
        sqlx::query(
            "UPDATE savings_groups SET current_cycle = current_cycle + 1, updated_at = now() WHERE id = $1",
        )
        .bind(group.id)
        .execute(&mut **tx)
        .await?;
    }

    write_audit(
        &state.db,
        None,
        "payout.processed",
        "group",
        Some(group.id.to_string()),
        json!({
            "cycle": cycle,
            "recipient": recipient_id,
            "amount": amount.to_string(),
            "blockchain_hash": payment.hash,
            "treasury": treasury_public,
        }),
    )
    .await;

    notify(
        &state.db,
        recipient_id,
        "Payout received",
        "You received a payout.",
    )
    .await;

    let members = sqlx::query_scalar::<_, Uuid>(
        "SELECT user_id FROM group_members WHERE group_id = $1 AND status = 'active' AND user_id <> $2",
    )
    .bind(group.id)
    .bind(recipient_id)
    .fetch_all(&state.db)
    .await?;
    for uid in members {
        notify(
            &state.db,
            uid,
            "Rotating payout completed",
            "Rotating payout completed.",
        )
        .await;
    }

    Ok(payout)
}

/// GET /api/groups/:id/payouts
pub async fn list_payouts(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(group_id): Path<Uuid>,
) -> AppResult<Json<Vec<Payout>>> {
    if !is_active_member(&state.db, group_id, auth.user_id).await? && !auth.is_platform_admin() {
        return Err(AppError::Forbidden);
    }

    let rows = sqlx::query_as::<_, Payout>(
        &format!("SELECT {PAYOUT_COLUMNS} FROM payouts WHERE group_id = $1 ORDER BY cycle DESC"),
    )
    .bind(group_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(rows))
}
