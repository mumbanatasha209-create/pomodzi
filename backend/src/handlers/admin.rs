use crate::{
    auth::AdminUser,
    error::AppResult,
    models::{AuditLog, SavingsGroup, User, UserPublic},
    state::AppState,
};
use axum::{extract::State, Json};
use serde_json::{json, Value};

pub async fn stats(State(state): State<AppState>, _admin: AdminUser) -> AppResult<Json<Value>> {
    let users = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM users").fetch_one(&state.db).await?;
    let groups = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM savings_groups").fetch_one(&state.db).await?;
    let active = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM savings_groups WHERE status = 'active'").fetch_one(&state.db).await?;
    let contribs = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM contributions WHERE status = 'paid'").fetch_one(&state.db).await?;
    let payouts = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM payouts WHERE status = 'completed'").fetch_one(&state.db).await?;
    let txs = sqlx::query_scalar::<_, i64>("SELECT COUNT(*) FROM transactions").fetch_one(&state.db).await?;
    Ok(Json(json!({ "users": users, "groups": groups, "active_groups": active, "contributions_paid": contribs, "payouts_completed": payouts, "transactions": txs })))
}

pub async fn list_users(State(state): State<AppState>, _admin: AdminUser) -> AppResult<Json<Vec<UserPublic>>> {
    let rows = sqlx::query_as::<_, User>(
        r#"SELECT id, full_name, email, phone, password_hash, role::text AS role,
                  stellar_public_key, stellar_secret_key, created_at, updated_at
           FROM users ORDER BY created_at DESC LIMIT 500"#,
    ).fetch_all(&state.db).await?;
    Ok(Json(rows.into_iter().map(UserPublic::from).collect()))
}

pub async fn list_groups(State(state): State<AppState>, _admin: AdminUser) -> AppResult<Json<Vec<SavingsGroup>>> {
    let rows = sqlx::query_as::<_, SavingsGroup>(
        r#"SELECT id, name, description, admin_id, contribution_amount, currency,
                  frequency::text AS frequency, current_cycle, status::text AS status,
                  invite_code, treasury_public_key, treasury_secret_key, created_at, updated_at
           FROM savings_groups ORDER BY created_at DESC LIMIT 500"#,
    ).fetch_all(&state.db).await?;
    Ok(Json(rows))
}

pub async fn audit_logs(State(state): State<AppState>, _admin: AdminUser) -> AppResult<Json<Vec<AuditLog>>> {
    let rows = sqlx::query_as::<_, AuditLog>(
        r#"SELECT id, actor_id, action, entity_type, entity_id, metadata, created_at
           FROM audit_logs ORDER BY created_at DESC LIMIT 500"#,
    ).fetch_all(&state.db).await?;
    Ok(Json(rows))
}
