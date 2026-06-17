use crate::{auth::AuthUser, error::AppResult, models::Transaction, state::AppState};
use axum::{extract::State, Json};

/// GET /api/transactions — the caller's transaction history.
pub async fn list_transactions(
    State(state): State<AppState>,
    auth: AuthUser,
) -> AppResult<Json<Vec<Transaction>>> {
    let rows = sqlx::query_as::<_, Transaction>(
        r#"SELECT id, user_id, group_id, tx_type::text AS tx_type, amount, currency,
                  status::text AS status, blockchain_hash,
                  transaction_source::text AS transaction_source, memo, created_at
           FROM transactions WHERE user_id = $1
           ORDER BY created_at DESC
           LIMIT 200"#,
    )
    .bind(auth.user_id)
    .fetch_all(&state.db)
    .await?;

    Ok(Json(rows))
}
