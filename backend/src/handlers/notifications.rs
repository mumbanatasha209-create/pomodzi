use crate::{auth::AuthUser, error::AppResult, models::Notification, state::AppState};
use axum::{extract::{Path, State}, Json};
use uuid::Uuid;

pub async fn list_notifications(
    State(state): State<AppState>,
    auth: AuthUser,
) -> AppResult<Json<Vec<Notification>>> {
    let rows = sqlx::query_as::<_, Notification>(
        r#"SELECT id, user_id, title, message, is_read, created_at
           FROM notifications WHERE user_id = $1 ORDER BY created_at DESC LIMIT 100"#,
    )
    .bind(auth.user_id)
    .fetch_all(&state.db)
    .await?;
    Ok(Json(rows))
}

pub async fn mark_read(
    State(state): State<AppState>,
    auth: AuthUser,
    Path(id): Path<Uuid>,
) -> AppResult<Json<Notification>> {
    let row = sqlx::query_as::<_, Notification>(
        r#"UPDATE notifications SET is_read = true WHERE id = $1 AND user_id = $2
           RETURNING id, user_id, title, message, is_read, created_at"#,
    )
    .bind(id)
    .bind(auth.user_id)
    .fetch_one(&state.db)
    .await?;
    Ok(Json(row))
}
