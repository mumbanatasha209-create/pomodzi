use axum::{
    body::Body,
    extract::{ConnectInfo, State},
    http::{Request, StatusCode},
    middleware::Next,
    response::{IntoResponse, Response},
};
use governor::{
    clock::DefaultClock,
    state::keyed::DashMapStateStore,
    Quota, RateLimiter,
};
use std::{net::SocketAddr, num::NonZeroU32, sync::Arc};

pub type AuthRateLimiter =
    RateLimiter<String, DashMapStateStore<String>, DefaultClock>;

pub fn new_auth_rate_limiter() -> Arc<AuthRateLimiter> {
    let quota = Quota::per_second(NonZeroU32::new(2).unwrap());
    Arc::new(RateLimiter::dashmap(quota))
}

pub async fn auth_rate_limit(
    State(limiter): State<Arc<AuthRateLimiter>>,
    ConnectInfo(addr): ConnectInfo<SocketAddr>,
    request: Request<Body>,
    next: Next,
) -> Response {
    let key = addr.ip().to_string();
    if limiter.check_key(&key).is_err() {
        return (
            StatusCode::TOO_MANY_REQUESTS,
            axum::Json(serde_json::json!({ "error": "Too many requests. Please try again later." })),
        )
            .into_response();
    }
    next.run(request).await
}
