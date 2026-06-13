use crate::error::{AppError, AppResult};

/// Hash a plaintext password using bcrypt.
pub fn hash_password(plain: &str) -> AppResult<String> {
    bcrypt::hash(plain, bcrypt::DEFAULT_COST)
        .map_err(|e| AppError::Internal(format!("password hash failed: {e}")))
}

/// Verify a plaintext password against a bcrypt hash.
pub fn verify_password(plain: &str, hash: &str) -> bool {
    bcrypt::verify(plain, hash).unwrap_or(false)
}
