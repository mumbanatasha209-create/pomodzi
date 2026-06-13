pub mod admin;
pub mod auth;
pub mod contributions;
pub mod groups;
pub mod notifications;
pub mod payouts;
pub mod transactions;
pub mod users;

use crate::{error::AppResult, models::User};
use sqlx::PgPool;
use uuid::Uuid;

/// Generate a short, human-friendly invite code, e.g. "PAM-3F9A2B".
pub fn generate_invite_code() -> String {
    let raw = Uuid::new_v4().simple().to_string().to_uppercase();
    format!("PAM-{}", &raw[..6])
}

/// Write an entry to the audit log. Failures are logged but not fatal.
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

/// Create a notification for a user.
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

/// Load a full user row by id.
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
