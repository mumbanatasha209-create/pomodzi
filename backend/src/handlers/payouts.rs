use crate::{
    auth::AuthUser,
    error::{AppError, AppResult},
    handlers::{groups::is_active_member, notify, write_audit},
    models::{Payout, SavingsGroup},
    state::AppState,
};
use axum::{
    extract::{Path, State},
    Json,
};
use bigdecimal::BigDecimal;
use serde_json::json;
use uuid::Uuid;

/// Core payout engine. Called automatically once all members have paid.
///
/// Picks the next member in the rotation that has not yet received a payout,
/// pays out the pooled contributions, advances the group to the next cycle,
/// and notifies everyone.
pub async fn process_payout(state: &AppState, group: &SavingsGroup) -> AppResult<Payout> {
    let cycle = group.current_cycle;

    // Don't double-pay a cycle.
    let already = sqlx::query_scalar::<_, i64>(
        "SELECT COUNT(*) FROM payouts WHERE group_id = $1 AND cycle = $2",
    )
    .bind(group.id)
    .bind(cycle)
    .fetch_one(&state.db)
    .await?;
    if already > 0 {
        return Err(AppError::Conflict("Payout already processed for this cycle".into()));
    }

    // Next recipient = lowest rotation_order among members who haven't been paid.
    let recipient = sqlx::query_as::<_, (Uuid, Option<String>)>(
        r#"SELECT gm.user_id, u.stellar_public_key
           FROM group_members gm
           JOIN users u ON u.id = gm.user_id
           WHERE gm.group_id = $1 AND gm.status = 'active' AND gm.has_received_payout = false
           ORDER BY gm.rotation_order ASC, gm.joined_at ASC
           LIMIT 1"#,
    )
    .bind(group.id)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::BadRequest("All members have already received a payout".into()))?;

    let recipient_id = recipient.0;

    // Pool = sum of paid contributions this cycle.
    let amount: BigDecimal = sqlx::query_scalar::<_, BigDecimal>(
        r#"SELECT COALESCE(SUM(amount), 0) FROM contributions
           WHERE group_id = $1 AND cycle = $2 AND status = 'paid'"#,
    )
    .bind(group.id)
    .bind(cycle)
    .fetch_one(&state.db)
    .await?;

    // Testnet demo ledger reference. (Real per-member XLM transfers can be
    // layered on here using the stored testnet secret keys.)
    let tx_ref = format!("payout-{}", Uuid::new_v4().simple());

    let payout = sqlx::query_as::<_, Payout>(
        r#"INSERT INTO payouts (group_id, cycle, recipient_id, amount, status, stellar_tx_hash, paid_at)
           VALUES ($1, $2, $3, $4, 'completed', $5, now())
           RETURNING id, group_id, cycle, recipient_id, amount, status::text AS status,
                     stellar_tx_hash, paid_at, created_at"#,
    )
    .bind(group.id)
    .bind(cycle)
    .bind(recipient_id)
    .bind(&amount)
    .bind(&tx_ref)
    .fetch_one(&state.db)
    .await?;

    // Mark recipient as paid in this rotation.
    sqlx::query(
        "UPDATE group_members SET has_received_payout = true WHERE group_id = $1 AND user_id = $2",
    )
    .bind(group.id)
    .bind(recipient_id)
    .execute(&state.db)
    .await?;

    // Transaction history entry for the recipient.
    sqlx::query(
        r#"INSERT INTO transactions (user_id, group_id, tx_type, amount, status, stellar_tx_hash, memo)
           VALUES ($1, $2, 'payout', $3, 'success', $4, $5)"#,
    )
    .bind(recipient_id)
    .bind(group.id)
    .bind(&amount)
    .bind(&tx_ref)
    .bind(format!("Payout from {} (cycle {})", group.name, cycle))
    .execute(&state.db)
    .await?;

    // Determine whether the rotation round is complete.
    let remaining = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM group_members
           WHERE group_id = $1 AND status = 'active' AND has_received_payout = false"#,
    )
    .bind(group.id)
    .fetch_one(&state.db)
    .await?;

    if remaining == 0 {
        // Whole rotation finished — mark the group completed.
        sqlx::query("UPDATE savings_groups SET status = 'completed', updated_at = now() WHERE id = $1")
            .bind(group.id)
            .execute(&state.db)
            .await?;
    } else {
        // Advance to next cycle.
        sqlx::query(
            "UPDATE savings_groups SET current_cycle = current_cycle + 1, updated_at = now() WHERE id = $1",
        )
        .bind(group.id)
        .execute(&state.db)
        .await?;
    }

    // Notify everyone.
    notify(
        &state.db,
        recipient_id,
        "You received a payout!",
        &format!("You received {} {} from \"{}\".", amount, group.currency, group.name),
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
            "Cycle payout processed",
            &format!("Cycle {} payout for \"{}\" was sent. Next cycle has started.", cycle, group.name),
        )
        .await;
    }

    write_audit(
        &state.db,
        None,
        "payout.processed",
        "group",
        Some(group.id.to_string()),
        json!({ "cycle": cycle, "recipient": recipient_id, "amount": amount.to_string() }),
    )
    .await;

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
        r#"SELECT id, group_id, cycle, recipient_id, amount, status::text AS status,
                  stellar_tx_hash, paid_at, created_at
           FROM payouts WHERE group_id = $1 ORDER BY cycle DESC"#,
    )
    .bind(group_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(rows))
}
