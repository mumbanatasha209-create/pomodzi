pub mod admin;
pub mod auth;
pub mod contributions;
pub mod groups;
pub mod notifications;
pub mod payouts;
pub mod transactions;
pub mod users;

use crate::{
    crypto::KeyEncryption,
    error::{AppError, AppResult},
    models::User,
};
use sqlx::PgPool;
use uuid::Uuid;

pub fn generate_invite_code() -> String {
    let raw = Uuid::new_v4().simple().to_string().to_uppercase();
    format!("PAM-{}", &raw[..6])
}

pub async fn write_audit(
    db: &PgPool,
    actor_id: Option<Uuid>,
    action: &str,
    entity_type: &str,
    entity_id: Option<String>,
    metadata: serde_json::Value,
) {
    let res = sqlx::query(
        r#"INSERT INTO audit_logs (actor_id, action, entity_type, entity_id, metadata)
           VALUES ($1, $2, $3, $4, $5)"#,
    )
    .bind(actor_id)
    .bind(action)
    .bind(entity_type)
    .bind(entity_id)
    .bind(metadata)
    .execute(db)
    .await;
    if let Err(e) = res {
        tracing::warn!("failed to write audit log: {e}");
    }
}

pub async fn notify(db: &PgPool, user_id: Uuid, title: &str, message: &str) {
    let res = sqlx::query(
        r#"INSERT INTO notifications (user_id, title, message) VALUES ($1, $2, $3)"#,
    )
    .bind(user_id)
    .bind(title)
    .bind(message)
    .execute(db)
    .await;
    if let Err(e) = res {
        tracing::warn!("failed to create notification: {e}");
    }
}

pub async fn get_user(db: &PgPool, id: Uuid) -> AppResult<Option<User>> {
    let user = sqlx::query_as::<_, User>(
        r#"SELECT id, full_name, email, phone, password_hash, role::text AS role,
                  stellar_public_key, stellar_secret_key, created_at, updated_at
           FROM users WHERE id = $1"#,
    )
    .bind(id)
    .fetch_optional(db)
    .await?;
    Ok(user)
}

pub fn encrypt_secret(crypto: &KeyEncryption, secret: &str) -> AppResult<String> {
    crypto
        .encrypt(secret)
        .map_err(|e| AppError::Internal(format!("failed to encrypt secret key: {e}")))
}

pub fn decrypt_secret(crypto: &KeyEncryption, stored: &str) -> AppResult<String> {
    if KeyEncryption::is_encrypted(stored) {
        crypto
            .decrypt(stored)
            .map_err(|e| AppError::Internal(format!("failed to decrypt secret key: {e}")))
    } else {
        Ok(stored.to_string())
    }
}

pub async fn get_user_signing_secret(
    db: &PgPool,
    crypto: &KeyEncryption,
    user_id: Uuid,
) -> AppResult<(User, String)> {
    let user = get_user(db, user_id)
        .await?
        .ok_or_else(|| AppError::NotFound("User not found".into()))?;
    let stored = user
        .stellar_secret_key
        .as_deref()
        .ok_or_else(|| AppError::BadRequest("User wallet is not provisioned".into()))?;
    let secret = decrypt_secret(crypto, stored)?;
    Ok((user, secret))
}

pub async fn get_group_treasury_secret(
    db: &PgPool,
    crypto: &KeyEncryption,
    group_id: Uuid,
) -> AppResult<(String, String)> {
    let row: (Option<String>, Option<String>) = sqlx::query_as(
        "SELECT treasury_public_key, treasury_secret_key FROM savings_groups WHERE id = $1",
    )
    .bind(group_id)
    .fetch_one(db)
    .await?;

    let public = row
        .0
        .clone()
        .ok_or_else(|| AppError::BadRequest("Group treasury wallet is not provisioned".into()))?;
    let stored = row.1.as_deref().ok_or_else(|| {
        AppError::BadRequest("Group treasury wallet is not provisioned".into())
    })?;
    let secret = decrypt_secret(crypto, stored)?;
    Ok((public, secret))
}

pub fn group_lock_key(group_id: Uuid) -> i64 {
    let bytes = group_id.as_bytes();
    i64::from_be_bytes(bytes[..8].try_into().unwrap())
}
