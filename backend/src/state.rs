use crate::{config::Config, crypto::KeyEncryption, middleware::rate_limit::AuthRateLimiter, stellar::StellarClient};
use sqlx::PgPool;
use std::sync::Arc;

#[derive(Clone)]
pub struct AppState {
    pub db: PgPool,
    pub config: Arc<Config>,
    pub stellar: StellarClient,
    pub crypto: Arc<KeyEncryption>,
    pub auth_rate_limiter: Arc<AuthRateLimiter>,
}

impl AppState {
    pub fn new(db: PgPool, config: Config, auth_rate_limiter: Arc<AuthRateLimiter>) -> Self {
        let stellar = StellarClient::new(
            config.horizon_url.clone(),
            config.friendbot_url.clone(),
            config.stellar_network_passphrase.clone(),
        );
        let crypto = Arc::new(KeyEncryption::from_key_bytes(&config.encryption_key));
        Self {
            db,
            config: Arc::new(config),
            stellar,
            crypto,
            auth_rate_limiter,
        }
    }
}
