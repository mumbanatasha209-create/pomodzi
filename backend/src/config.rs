use std::env;

#[derive(Clone, Debug)]
pub struct Config {
    pub database_url: String,
    pub server_addr: String,
    pub jwt_secret: String,
    pub jwt_expiry_hours: i64,
    pub frontend_origin: String,
    pub horizon_url: String,
    pub friendbot_url: String,
    pub platform_admin_email: String,
}

impl Config {
    /// Load configuration from environment variables (and `.env` if present).
    pub fn from_env() -> anyhow::Result<Self> {
        // Ignore error: in production env vars may be set directly.
        let _ = dotenvy::dotenv();

        Ok(Self {
            database_url: env::var("DATABASE_URL")
                .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/pamodzi".into()),
            server_addr: env::var("SERVER_ADDR").unwrap_or_else(|_| "0.0.0.0:8080".into()),
            jwt_secret: env::var("JWT_SECRET")
                .unwrap_or_else(|_| "change-me-to-a-long-random-secret".into()),
            jwt_expiry_hours: env::var("JWT_EXPIRY_HOURS")
                .ok()
                .and_then(|v| v.parse().ok())
                .unwrap_or(72),
            frontend_origin: env::var("FRONTEND_ORIGIN")
                .unwrap_or_else(|_| "http://localhost:3000".into()),
            horizon_url: env::var("STELLAR_HORIZON_URL")
                .unwrap_or_else(|_| "https://horizon-testnet.stellar.org".into()),
            friendbot_url: env::var("STELLAR_FRIENDBOT_URL")
                .unwrap_or_else(|_| "https://friendbot.stellar.org".into()),
            platform_admin_email: env::var("PLATFORM_ADMIN_EMAIL")
                .unwrap_or_else(|_| "admin@pamodzi.africa".into()),
        })
    }
}
