pub mod auth;
pub mod config;
pub mod crypto;
pub mod db;
pub mod error;
pub mod handlers;
pub mod international;
pub mod middleware;
pub mod models;
pub mod routes;
pub mod security;
pub mod state;
pub mod stellar;

use axum::{middleware::from_fn_with_state, Router};
use middleware::rate_limit::{auth_rate_limit, new_auth_rate_limiter};
use state::AppState;
use tower::ServiceBuilder;
use tower_http::{
    cors::{Any, CorsLayer},
    limit::RequestBodyLimitLayer,
    set_header::SetResponseHeaderLayer,
    trace::TraceLayer,
};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

pub async fn run() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(
            tracing_subscriber::EnvFilter::try_from_default_env()
                .unwrap_or_else(|_| "info,pamodzi_backend=debug,tower_http=info".into()),
        )
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = config::Config::from_env()?;
    let pool = db::init_pool(&config.database_url).await?;
    let auth_rate_limiter = new_auth_rate_limiter();
    let state = AppState::new(pool, config.clone(), auth_rate_limiter);

    let cors = CorsLayer::new()
        .allow_origin(config.frontend_origin.parse::<axum::http::HeaderValue>()?)
        .allow_methods(Any)
        .allow_headers(Any);

    let security_headers = ServiceBuilder::new()
        .layer(SetResponseHeaderLayer::if_not_present(
            axum::http::header::X_CONTENT_TYPE_OPTIONS,
            axum::http::HeaderValue::from_static("nosniff"),
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            axum::http::header::X_FRAME_OPTIONS,
            axum::http::HeaderValue::from_static("DENY"),
        ))
        .layer(SetResponseHeaderLayer::if_not_present(
            axum::http::header::REFERRER_POLICY,
            axum::http::HeaderValue::from_static("strict-origin-when-cross-origin"),
        ));

    let auth_routes = Router::new()
        .route(
            "/api/auth/register",
            axum::routing::post(handlers::auth::register),
        )
        .route("/api/auth/login", axum::routing::post(handlers::auth::login))
        .layer(from_fn_with_state(
            state.auth_rate_limiter.clone(),
            auth_rate_limit,
        ));

    let app = Router::new()
        .merge(auth_routes)
        .merge(routes::protected_router())
        .route("/health", axum::routing::get(|| async { "ok" }))
        .layer(RequestBodyLimitLayer::new(1024 * 64))
        .layer(security_headers)
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(&config.server_addr).await?;
    tracing::info!("Pamodzi Finance API on http://{}", config.server_addr);
    tracing::info!("Stellar TESTNET ONLY — no real money");
    axum::serve(
        listener,
        app.into_make_service_with_connect_info::<std::net::SocketAddr>(),
    )
    .await?;
    Ok(())
}
