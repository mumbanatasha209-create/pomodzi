use crate::{handlers, state::AppState};
use axum::{routing::{get, post, put}, Router};

pub fn api_router() -> Router<AppState> {
    Router::new()
        .route("/api/auth/register", post(handlers::auth::register))
        .route("/api/auth/login", post(handlers::auth::login))
        .route("/api/auth/me", get(handlers::auth::me))
        .route("/api/wallet", get(handlers::users::wallet))
        .route("/api/groups", post(handlers::groups::create_group))
        .route("/api/groups", get(handlers::groups::list_my_groups))
        .route("/api/groups/join", post(handlers::groups::join_group))
        .route("/api/groups/:id", get(handlers::groups::get_group))
        .route("/api/groups/:id/members", post(handlers::groups::add_member))
        .route("/api/groups/:id/rotation", put(handlers::groups::set_rotation))
        .route("/api/groups/:id/contribute", post(handlers::contributions::contribute))
        .route("/api/groups/:id/contributions", get(handlers::contributions::list_contributions))
        .route("/api/groups/:id/payouts", get(handlers::payouts::list_payouts))
        .route("/api/transactions", get(handlers::transactions::list_transactions))
        .route("/api/notifications", get(handlers::notifications::list_notifications))
        .route("/api/notifications/:id/read", put(handlers::notifications::mark_read))
        .route("/api/admin/stats", get(handlers::admin::stats))
        .route("/api/admin/users", get(handlers::admin::list_users))
        .route("/api/admin/groups", get(handlers::admin::list_groups))
        .route("/api/admin/audit-logs", get(handlers::admin::audit_logs))
}
