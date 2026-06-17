use crate::{
    auth::{jwt, password, AuthUser},
    error::{AppError, AppResult},
    handlers::{encrypt_secret, get_user, notify, write_audit},
    international::{
        default_currency_for_country, default_timezone_for_country, validate_country,
        validate_email, validate_password, validate_phone,
    },
    models::{AuthResponse, LoginRequest, RegisterRequest, User, UserPublic, USER_COLUMNS},
    state::AppState,
    stellar::StellarClient,
};
use axum::{extract::State, Json};
use rust_decimal::Decimal;
use serde_json::json;

/// POST /api/auth/register — always creates a regular member (never platform_admin).
pub async fn register(
    State(state): State<AppState>,
    Json(payload): Json<RegisterRequest>,
) -> AppResult<Json<AuthResponse>> {
    let email = payload.email.trim().to_lowercase();
    if payload.full_name.trim().is_empty() {
        return Err(AppError::BadRequest("Full name is required".into()));
    }
    validate_email(&email)?;
    validate_password(
        &payload.password,
        payload.confirm_password.as_deref(),
    )?;

    let country = payload
        .country
        .as_deref()
        .map(validate_country)
        .transpose()?;
    let phone_country_code = payload
        .phone_country_code
        .as_deref()
        .map(validate_country)
        .transpose()?;
    let phone = payload
        .phone
        .as_deref()
        .map(|p| validate_phone(p, phone_country_code.as_deref().or(country.as_deref())))
        .transpose()?;

    let preferred_currency = country
        .as_deref()
        .map(default_currency_for_country)
        .unwrap_or("XLM")
        .to_string();
    let timezone = country
        .as_deref()
        .map(default_timezone_for_country)
        .unwrap_or("UTC")
        .to_string();

    let existing = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users WHERE email = $1")
        .bind(&email)
        .fetch_one(&state.db)
        .await?;
    if existing > 0 {
        return Err(AppError::Conflict("Email already registered".into()));
    }

    let password_hash = password::hash_password(&payload.password)?;
    let keypair = StellarClient::generate_keypair();
    let encrypted_secret = encrypt_secret(&state.crypto, &keypair.secret_key)?;

    let insert = format!(
        r#"INSERT INTO users
            (full_name, email, phone, password_hash, role, stellar_public_key, stellar_secret_key,
             country, phone_country_code, preferred_currency, timezone)
           VALUES ($1, $2, $3, $4, 'member'::user_role, $5, $6, $7, $8, $9, $10)
           RETURNING {USER_COLUMNS}"#
    );

    let user = sqlx::query_as::<_, User>(&insert)
        .bind(payload.full_name.trim())
        .bind(&email)
        .bind(phone.as_deref())
        .bind(&password_hash)
        .bind(&keypair.public_key)
        .bind(&encrypted_secret)
        .bind(country.as_deref())
        .bind(phone_country_code.as_deref())
        .bind(&preferred_currency)
        .bind(&timezone)
        .fetch_one(&state.db)
        .await?;

    match state.stellar.fund_with_friendbot(&keypair.public_key).await {
        Ok(hash) => {
            sqlx::query(
                r#"INSERT INTO transactions (user_id, tx_type, amount, status, blockchain_hash,
                   transaction_source, memo)
                   VALUES ($1, 'wallet_funding'::tx_type, $2, 'success', $3, 'stellar_testnet',
                   'Wallet Funding — Stellar testnet demo')"#,
            )
            .bind(user.id)
            .bind(Decimal::from(10000))
            .bind(&hash)
            .execute(&state.db)
            .await
            .ok();
            notify(
                &state.db,
                user.id,
                "Wallet ready",
                "Your wallet is ready.",
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
        json!({ "email": email, "role": "member", "country": country }),
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
    validate_email(&email)?;

    let query = format!("SELECT {USER_COLUMNS} FROM users WHERE email = $1");
    let user = sqlx::query_as::<_, User>(&query)
        .bind(&email)
        .fetch_optional(&state.db)
        .await?
        .ok_or_else(|| {
            tracing::warn!("failed login attempt for unknown email: {email}");
            AppError::Unauthorized
        })?;

    if !password::verify_password(&payload.password, &user.password_hash) {
        write_audit(
            &state.db,
            Some(user.id),
            "auth.login_failed",
            "user",
            Some(user.id.to_string()),
            json!({ "email": email }),
        )
        .await;
        tracing::warn!("failed login attempt for user {}", user.id);
        return Err(AppError::Unauthorized);
    }

    write_audit(
        &state.db,
        Some(user.id),
        "auth.login",
        "user",
        Some(user.id.to_string()),
        json!({ "email": email }),
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

/// GET /api/auth/me
pub async fn me(State(state): State<AppState>, auth: AuthUser) -> AppResult<Json<UserPublic>> {
    let user = get_user(&state.db, auth.user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".into()))?;
    Ok(Json(UserPublic::from(user)))
}
