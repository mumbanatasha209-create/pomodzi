use anyhow::{anyhow, Result};

const UNSAFE_JWT_SECRETS: &[&str] = &[
    "change-me-to-a-long-random-secret",
    "secret",
    "jwt-secret",
    "your-secret-key",
    "pamodzi",
    "admin",
    "password",
    "12345678901234567890123456789012",
];

const UNSAFE_ENCRYPTION_KEYS: &[&str] = &[
    "change-me-to-a-32-byte-encryption-key!!",
    "0123456789abcdef0123456789abcdef",
    "encryption-key",
    "secret",
];

pub fn validate_jwt_secret(secret: &str) -> Result<()> {
    if secret.trim().is_empty() {
        return Err(anyhow!(
            "JWT_SECRET is required. Generate one with: openssl rand -hex 32"
        ));
    }
    if secret.len() < 32 {
        return Err(anyhow!(
            "JWT_SECRET must be at least 32 characters. Generate one with: openssl rand -hex 32"
        ));
    }
    let lower = secret.to_lowercase();
    if UNSAFE_JWT_SECRETS
        .iter()
        .any(|bad| lower == bad.to_lowercase())
    {
        return Err(anyhow!(
            "JWT_SECRET is an unsafe default value. Generate a unique secret with: openssl rand -hex 32"
        ));
    }
    Ok(())
}

pub fn parse_encryption_key(raw: &str) -> Result<[u8; 32]> {
    let trimmed = raw.trim();
    if trimmed.is_empty() {
        return Err(anyhow!(
            "ENCRYPTION_KEY is required. Generate one with: openssl rand -hex 32"
        ));
    }
    if trimmed.len() < 32 {
        return Err(anyhow!(
            "ENCRYPTION_KEY must be at least 32 characters. Generate one with: openssl rand -hex 32"
        ));
    }
    let lower = trimmed.to_lowercase();
    if UNSAFE_ENCRYPTION_KEYS
        .iter()
        .any(|bad| lower == bad.to_lowercase())
    {
        return Err(anyhow!(
            "ENCRYPTION_KEY is an unsafe default value. Generate a unique key with: openssl rand -hex 32"
        ));
    }

    if trimmed.len() == 64 && trimmed.chars().all(|c| c.is_ascii_hexdigit()) {
        let bytes = hex::decode(trimmed).context_hex()?;
        if bytes.len() == 32 {
            let mut key = [0u8; 32];
            key.copy_from_slice(&bytes);
            return Ok(key);
        }
    }

    let bytes = trimmed.as_bytes();
    if bytes.len() >= 32 {
        let mut key = [0u8; 32];
        key.copy_from_slice(&bytes[..32]);
        return Ok(key);
    }

    Err(anyhow!(
        "ENCRYPTION_KEY must be 32 bytes (64-char hex recommended). Generate with: openssl rand -hex 32"
    ))
}

trait HexContext {
    fn context_hex(self) -> Result<Vec<u8>>;
}

impl HexContext for Result<Vec<u8>, hex::FromHexError> {
    fn context_hex(self) -> Result<Vec<u8>> {
        self.map_err(|e| anyhow!("invalid ENCRYPTION_KEY hex: {e}"))
    }
}

pub fn validate_contribution_amount(
    submitted: &rust_decimal::Decimal,
    required: &rust_decimal::Decimal,
) -> Result<(), crate::error::AppError> {
    use rust_decimal::Decimal;
    if *submitted <= Decimal::ZERO {
        return Err(crate::error::AppError::BadRequest(
            "Contribution amount must be greater than zero".into(),
        ));
    }
    if submitted != required {
        return Err(crate::error::AppError::BadRequest(
            "Contribution amount must match the required group amount.".into(),
        ));
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use rust_decimal::Decimal;

    #[test]
    fn rejects_missing_jwt_secret() {
        assert!(validate_jwt_secret("").is_err());
    }

    #[test]
    fn rejects_short_jwt_secret() {
        assert!(validate_jwt_secret("short").is_err());
    }

    #[test]
    fn rejects_default_jwt_secret() {
        assert!(validate_jwt_secret("change-me-to-a-long-random-secret").is_err());
    }

    #[test]
    fn accepts_strong_jwt_secret() {
        assert!(validate_jwt_secret("a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2").is_ok());
    }

    #[test]
    fn contribution_must_match_group_amount() {
        let required = Decimal::new(1000, 2);
        assert!(validate_contribution_amount(&Decimal::new(1000, 2), &required).is_ok());
        assert!(validate_contribution_amount(&Decimal::new(500, 2), &required).is_err());
        assert!(validate_contribution_amount(&Decimal::ZERO, &required).is_err());
        assert!(validate_contribution_amount(&Decimal::new(-100, 2), &required).is_err());
    }
}
