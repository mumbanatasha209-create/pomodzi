use crate::{
    auth::AdminUser,
    error::AppResult,
    models::{AuditLog, SavingsGroup, User, UserPublic, GROUP_COLUMNS, USER_COLUMNS},
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

    let users_by_country: Vec<(Option<String>, i64)> = sqlx::query_as(
        r#"SELECT country, COUNT(*)::bigint AS count FROM users GROUP BY country ORDER BY count DESC"#,
    )
    .fetch_all(&state.db)
    .await?;

    let volume_by_currency: Vec<(String, rust_decimal::Decimal)> = sqlx::query_as(
        r#"SELECT currency, COALESCE(SUM(amount), 0) FROM transactions
           WHERE status = 'success' GROUP BY currency ORDER BY SUM(amount) DESC"#,
    )
    .fetch_all(&state.db)
    .await?;

    let stellar_success: (i64, i64) = sqlx::query_as(
        r#"SELECT
             COUNT(*) FILTER (WHERE status = 'success' AND transaction_source = 'stellar_testnet'),
             COUNT(*) FILTER (WHERE transaction_source = 'stellar_testnet')
           FROM transactions"#,
    )
    .fetch_one(&state.db)
    .await?;

    let provider_usage: Vec<(Option<String>, i64)> = sqlx::query_as(
        r#"SELECT payment_provider, COUNT(*)::bigint FROM contributions
           WHERE payment_provider IS NOT NULL GROUP BY payment_provider ORDER BY count DESC"#,
    )
    .fetch_all(&state.db)
    .await?;

    let cross_border_groups = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(DISTINCT g.id) FROM savings_groups g
           JOIN group_members gm ON gm.group_id = g.id
           JOIN users u ON u.id = gm.user_id
           WHERE g.primary_country IS NOT NULL AND u.country IS NOT NULL
             AND g.primary_country <> u.country"#,
    )
    .fetch_one(&state.db)
    .await?;

    let suspicious = sqlx::query_scalar::<_, i64>(
        r#"SELECT COUNT(*) FROM audit_logs
           WHERE action IN ('auth.login_failed', 'contribution.rejected')"#,
    )
    .fetch_one(&state.db)
    .await?;

    let stellar_rate = if stellar_success.1 > 0 {
        (stellar_success.0 as f64 / stellar_success.1 as f64) * 100.0
    } else {
        100.0
    };

    Ok(Json(json!({
        "users": users,
        "groups": groups,
        "active_groups": active,
        "active_savings_circles": active,
        "contributions_paid": contribs,
        "payouts_completed": payouts,
        "transactions": txs,
        "users_by_country": users_by_country.into_iter().map(|(c, n)| json!({ "country": c, "count": n })).collect::<Vec<_>>(),
        "volume_by_currency": volume_by_currency.into_iter().map(|(c, a)| json!({ "currency": c, "volume": a.to_string() })).collect::<Vec<_>>(),
        "stellar_success_rate": stellar_rate,
        "payment_provider_usage": provider_usage.into_iter().map(|(p, n)| json!({ "provider": p, "count": n })).collect::<Vec<_>>(),
        "cross_border_groups": cross_border_groups,
        "suspicious_activity": suspicious,
    })))
}

pub async fn list_users(State(state): State<AppState>, _admin: AdminUser) -> AppResult<Json<Vec<UserPublic>>> {
    let query = format!("SELECT {USER_COLUMNS} FROM users ORDER BY created_at DESC LIMIT 500");
    let rows = sqlx::query_as::<_, User>(&query).fetch_all(&state.db).await?;
    Ok(Json(rows.into_iter().map(UserPublic::from).collect()))
}

pub async fn list_groups(State(state): State<AppState>, _admin: AdminUser) -> AppResult<Json<Vec<SavingsGroup>>> {
    let query = format!("SELECT {GROUP_COLUMNS} FROM savings_groups ORDER BY created_at DESC LIMIT 500");
    let rows = sqlx::query_as::<_, SavingsGroup>(&query).fetch_all(&state.db).await?;
    Ok(Json(rows))
}

pub async fn audit_logs(State(state): State<AppState>, _admin: AdminUser) -> AppResult<Json<Vec<AuditLog>>> {
    let rows = sqlx::query_as::<_, AuditLog>(
        r#"SELECT id, actor_id, action, entity_type, entity_id, metadata, created_at
           FROM audit_logs ORDER BY created_at DESC LIMIT 500"#,
    ).fetch_all(&state.db).await?;
    Ok(Json(rows))
}
