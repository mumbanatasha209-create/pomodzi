mod auth;
mod config;
mod db;
mod error;
mod handlers;
mod models;
mod routes;
mod state;
mod stellar;

use axum::Router;
use state::AppState;
use tower_http::{cors::{Any, CorsLayer}, trace::TraceLayer};
use tracing_subscriber::{layer::SubscriberExt, util::SubscriberInitExt};

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    tracing_subscriber::registry()
        .with(tracing_subscriber::EnvFilter::try_from_default_env().unwrap_or_else(|_| "info,pamodzi_backend=debug,tower_http=info".into()))
        .with(tracing_subscriber::fmt::layer())
        .init();

    let config = config::Config::from_env()?;
    let pool = db::init_pool(&config.database_url).await?;
    let state = AppState::new(pool, config.clone());

    let cors = CorsLayer::new()
        .allow_origin(config.frontend_origin.parse::<axum::http::HeaderValue>()?)
        .allow_methods(Any)
        .allow_headers(Any);

    let app = Router::new()
        .merge(routes::api_router())
        .route("/health", axum::routing::get(|| async { "ok" }))
        .layer(cors)
        .layer(TraceLayer::new_for_http())
        .with_state(state);

    let listener = tokio::net::TcpListener::bind(&config.server_addr).await?;
    tracing::info!("Pamodzi Finance API on http://{}", config.server_addr);
    tracing::info!("Stellar TESTNET ONLY — no real money");
    axum::serve(listener, app).await?;
    Ok(())
}
