use crate::{config::Config, stellar::StellarClient};
use sqlx::PgPool;
use std::sync::Arc;

/// Shared application state injected into every handler.
#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub config: Arc<Config>,
    pub stellar: StellarClient,
}

impl AppState {
    pub fn new(db: PgPool, config: Config) -> Self {
        let stellar = StellarClient::new(config.horizon_url.clone(), config.friendbot_url.clone());
        Self {
            db,
            config: Arc::new(config),
            stellar,
        }
    }
}
