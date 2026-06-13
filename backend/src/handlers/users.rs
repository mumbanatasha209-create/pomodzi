use crate::{
    auth::AuthUser,
    error::{AppError, AppResult},
    handlers::get_user,
    state::AppState,
};
use axum::{extract::State, Json};
use serde_json::{json, Value};

/// GET /api/wallet
/// Returns the user's Stellar testnet public key and live native balance.
pub async fn wallet(State(state): State<AppState>, auth: AuthUser) -> AppResult<Json<Value>> {
    let user = get_user(&state.db, auth.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".into()))?;

    let public_key = user
        .stellar_public_key
        .ok_or_else(|| AppError::NotFound("No wallet provisioned".into()))?;

    let balance = state
        .stellar
        .get_native_balance(&public_key)
        .await
        .unwrap_or_else(|_| "0".to_string());

    Ok(Json(json!({
        "public_key": public_key,
        "balance": balance,
        "asset": "XLM",
        "network": "testnet",
        "explorer_url": format!("https://stellar.expert/explorer/testnet/account/{public_key}"),
    })))
}
