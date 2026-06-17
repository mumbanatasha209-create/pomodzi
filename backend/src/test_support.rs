use pamodzi_backend::{
    config::Config,
    crypto::KeyEncryption,
    middleware::rate_limit::new_auth_rate_limiter,
    state::AppState,
    stellar::StellarClient,
};
use sqlx::PgPool;
use std::sync::Arc;

pub fn test_state(db: PgPool, config: Config) -> AppState {
    let stellar = StellarClient::new(
        config.horizon_url.clone(),
        config.friendbot_url.clone(),
        config.stellar_network_passphrase.clone(),
    );
    let crypto = Arc::new(KeyEncryption::from_key_bytes(&config.encryption_key));
    AppState {
        db,
        config: Arc::new(config),
        stellar,
        crypto,
        auth_rate_limiter: new_auth_rate_limiter(),
    }
}
