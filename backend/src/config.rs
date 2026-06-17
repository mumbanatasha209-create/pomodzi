use std::env;

use crate::security::{parse_encryption_key, validate_jwt_secret};

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub server_addr: String,
    pub jwt_secret: String,
    pub jwt_expiry_hours: i64,
    pub frontend_origin: String,
    pub horizon_url: String,
    pub friendbot_url: String,
    pub stellar_network_passphrase: String,
    pub encryption_key: [u8; 32],
}

impl Config {
    /// Load configuration from environment variables (and `.env` if present).
    pub fn from_env() -> anyhow::Result<Self> {
        let _ = dotenvy::dotenv();

        let jwt_secret = env::var("JWT_SECRET")?;
        validate_jwt_secret(&jwt_secret)?;

        let encryption_key_raw = env::var("ENCRYPTION_KEY")?;
        let encryption_key = parse_encryption_key(&encryption_key_raw)?;

        let horizon_url = env::var("STELLAR_HORIZON_URL")
            .unwrap_or_else(|_| "https://horizon-testnet.stellar.org".into());
        if !horizon_url.contains("testnet") {
            anyhow::bail!("STELLAR_HORIZON_URL must point to Stellar testnet only");
        }

        Ok(Self {
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/pamodzi".into()),
            server_addr: env::var("SERVER_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".into()),
            jwt_secret,
            jwt_expiry_hours: env::var("JWT_EXPIRY_HOURS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(72),
            frontend_origin: env::var("FRONTEND_ORIGIN")
                .unwrap_or_else(|_| "http://localhost:3000".into()),
            horizon_url,
            friendbot_url: env::var("STELLAR_FRIENDBOT_URL")
                .unwrap_or_else(|_| "https://friendbot.stellar.org".into()),
            stellar_network_passphrase: env::var("STELLAR_NETWORK_PASSPHRASE")
                .unwrap_or_else(|_| "Test SDF Network ; September 2015".into()),
            encryption_key,
        })
    }
}
