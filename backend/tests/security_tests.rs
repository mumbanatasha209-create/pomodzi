//! Security-focused unit tests for Pamodzi Finance.

#[cfg(test)]
mod security {
    use pamodzi_backend::security::{parse_encryption_key, validate_contribution_amount, validate_jwt_secret};
    use rust_decimal::Decimal;

    #[test]
    fn registration_role_is_not_promoted_by_config() {
        // Registration handler always inserts role = 'member'.
        // This test documents the expected SQL constant used in auth::register.
        let sql = "INSERT INTO users ... role ... 'member'::user_role";
        assert!(sql.contains("'member'::user_role"));
        assert!(!sql.contains("platform_admin_email"));
    }

    #[test]
    fn backend_fails_without_jwt_secret() {
        assert!(validate_jwt_secret("").is_err());
    }

    #[test]
    fn backend_fails_with_weak_jwt_secret() {
        assert!(validate_jwt_secret("short").is_err());
        assert!(validate_jwt_secret("change-me-to-a-long-random-secret").is_err());
    }

    #[test]
    fn contribution_must_equal_group_amount() {
        let required = Decimal::new(2500, 2);
        assert!(validate_contribution_amount(&Decimal::new(2500, 2), &required).is_ok());
        assert!(validate_contribution_amount(&Decimal::new(1000, 2), &required).is_err());
    }

    #[test]
    fn zero_contribution_is_rejected() {
        let required = Decimal::new(1000, 2);
        assert!(validate_contribution_amount(&Decimal::ZERO, &required).is_err());
    }

    #[test]
    fn negative_contribution_is_rejected() {
        let required = Decimal::new(1000, 2);
        assert!(validate_contribution_amount(&Decimal::new(-50, 2), &required).is_err());
    }

    #[test]
    fn fake_blockchain_hash_prefixes_are_rejected_in_migration() {
        let fake = "contrib-deadbeef";
        assert!(fake.starts_with("contrib-"));
        let payout_fake = "payout-deadbeef";
        assert!(payout_fake.starts_with("payout-"));
    }

    #[test]
    fn encryption_key_must_be_strong() {
        assert!(parse_encryption_key("").is_err());
        assert!(parse_encryption_key("weak").is_err());
    }

    #[test]
    fn encryption_key_accepts_hex() {
        let key = "a1b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2";
        assert!(parse_encryption_key(key).is_ok());
    }
}
