use aes_gcm::{
    aead::{Aead, KeyInit},
    Aes256Gcm, Nonce,
};
use anyhow::{anyhow, Context, Result};
use base64::{engine::general_purpose::STANDARD as B64, Engine};
use rand::RngCore;

/// AES-256-GCM encryption for Stellar secret keys at rest.
#[derive(Clone)]
pub struct KeyEncryption {
    cipher: Aes256Gcm,
}

impl KeyEncryption {
    pub fn from_key_bytes(key: &[u8; 32]) -> Self {
        Self {
            cipher: Aes256Gcm::new_from_slice(key).expect("valid AES-256 key"),
        }
    }

    pub fn encrypt(&self, plaintext: &str) -> Result<String> {
        let mut nonce_bytes = [0u8; 12];
        rand::thread_rng().fill_bytes(&mut nonce_bytes);
        let nonce = Nonce::from_slice(&nonce_bytes);
        let ciphertext = self
            .cipher
            .encrypt(nonce, plaintext.as_bytes())
            .map_err(|e| anyhow!("encryption failed: {e}"))?;
        let mut out = Vec::with_capacity(12 + ciphertext.len());
        out.extend_from_slice(&nonce_bytes);
        out.extend_from_slice(&ciphertext);
        Ok(B64.encode(out))
    }

    pub fn decrypt(&self, encoded: &str) -> Result<String> {
        let raw = B64.decode(encoded).context("invalid encrypted secret encoding")?;
        if raw.len() < 13 {
            return Err(anyhow!("encrypted secret payload too short"));
        }
        let (nonce_bytes, ciphertext) = raw.split_at(12);
        let nonce = Nonce::from_slice(nonce_bytes);
        let plaintext = self
            .cipher
            .decrypt(nonce, ciphertext)
            .map_err(|e| anyhow!("decryption failed: {e}"))?;
        String::from_utf8(plaintext).context("decrypted secret is not valid UTF-8")
    }

    /// Returns true when the value looks like an encrypted blob (not a raw S... strkey).
    pub fn is_encrypted(value: &str) -> bool {
        !value.starts_with('S') && B64.decode(value).map(|v| v.len() >= 13).unwrap_or(false)
    }
}
