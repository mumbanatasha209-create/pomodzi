use crate::{
    auth::{jwt, password, AuthUser},
    error::{AppError, AppResult},
    handlers::{get_user, notify, write_audit},
    models::{AuthResponse, LoginRequest, RegisterRequest, User, UserPublic},
    state::AppState,
    stellar::StellarClient,
};
use axum::{extract::State, Json};
use serde_json::json;

/// POST /api/auth/register
/// Creates the user, provisions a Stellar testnet wallet, funds it via
/// Friendbot, and returns a JWT.
pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> AppResult<Json<AuthResponse>> {
    let email = payload.email.trim().to_lowercase();
    if payload.full_name.trim().is_empty() || email.is_empty() {
        return Err(AppError::BadRequest("Name and email are required".into()));
    }
    if payload.password.len() < 6 {
        return Err(AppError::BadRequest(
            "Password must be at least 6 characters".into(),
        ));
    }

    // Reject duplicate email early for a clean error message.
    let existing = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users WHERE email = $1")
        .bind(&email)
        .fetch_one(&state.db)
        .await?;
    if existing > 0 {
        return Err(AppError::Conflict("Email already registered".into()));
    }

    let password_hash = password::hash_password(&payload.password)?;

    // Bootstrap platform admin by configured email.
    let role = if email == state.config.platform_admin_email.to_lowercase() {
        "platform_admin"
    } else {
        "member"
    };

    // Provision Stellar testnet wallet.
    let keypair = StellarClient::generate_keypair();

    let user = sqlx::query_as::<_, User>(
        r#"INSERT INTO users
            (full_name, email, phone, password_hash, role, stellar_public_key, stellar_secret_key)
           VALUES ($1, $2, $3, $4, $5::user_role, $6, $7)
           RETURNING id, full_name, email, phone, password_hash, role::text AS role,
                     stellar_public_key, stellar_secret_key, created_at, updated_at"#,
    )
    .bind(payload.full_name.trim())
    .bind(&email)
    .bind(payload.phone.as_deref())
    .bind(&password_hash)
    .bind(role)
    .bind(&keypair.public_key)
    .bind(&keypair.secret_key)
    .fetch_one(&state.db)
    .await?;

    // Fund the wallet on testnet (best-effort, non-blocking failure).
    match state.stellar.fund_with_friendbot(&keypair.public_key).await {
        Ok(hash) => {
            sqlx::query(
                r#"INSERT INTO transactions (user_id, tx_type, amount, status, stellar_tx_hash, memo)
                   VALUES ($1, 'wallet_funding', 10000, 'success', $2, 'Testnet wallet funded by Friendbot')"#,
            )
            .bind(user.id)
            .bind(hash.as_deref())
            .execute(&state.db)
            .await
            .ok();
            notify(
                &state.db,
                user.id,
                "Wallet ready",
                "Your Stellar testnet wallet has been created and funded.",
            )
            .await;
        }
        Err(e) => tracing::warn!("friendbot funding failed for {}: {e}", keypair.public_key),
    }

    write_audit(
        &state.db,
        Some(user.id),
        "user.register",
        "user",
        Some(user.id.to_string()),
        json!({ "email": email, "role": role }),
    )
    .await;

    let token = jwt::issue_token(
        &state.config.jwt_secret,
        state.config.jwt_expiry_hours,
        user.id,
        &user.email,
        &user.role,
    )?;

    Ok(Json(AuthResponse {
        token,
        user: UserPublic::from(user),
    }))
}

/// POST /api/auth/login
pub async fn login(
    State(state): State<AppState>,
    Json(payload): Json<LoginRequest>,
) -> AppResult<Json<AuthResponse>> {
    let email = payload.email.trim().to_lowercase();

    let user = sqlx::query_as::<_, User>(
        r#"SELECT id, full_name, email, phone, password_hash, role::text AS role,
                  stellar_public_key, stellar_secret_key, created_at, updated_at
           FROM users WHERE email = $1"#,
    )
    .bind(&email)
    .fetch_optional(&state.db)
    .await?
    .ok_or_else(|| AppError::Unauthorized)?;

    if !password::verify_password(&payload.password, &user.password_hash) {
        return Err(AppError::Unauthorized);
    }

    let token = jwt::issue_token(
        &state.config.jwt_secret,
        state.config.jwt_expiry_hours,
        user.id,
        &user.email,
        &user.role,
    )?;

    Ok(Json(AuthResponse {
        token,
        user: UserPublic::from(user),
    }))
}

/// GET /api/auth/me
pub async fn me(State(state): State<AppState>, auth: AuthUser) -> AppResult<Json<UserPublic>> {
    let user = get_user(&state.db, auth.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".into()))?;
    Ok(Json(UserPublic::from(user)))
}
