//! Stellar **testnet** integration.
//!
//! This module is intentionally limited to safe, dependency-light testnet
//! operations that genuinely touch the Stellar network:
//!   * generating an ed25519 keypair encoded as Stellar strkeys (G.../S...)
//!   * funding a new account via Friendbot (testnet faucet)
//!   * reading the native (XLM) balance from Horizon
//!
//! NO MAINNET. NO REAL MONEY. Secret keys are stored for demo purposes only.

use ed25519_dalek::SigningKey;
use rand::rngs::OsRng;
use serde::Deserialize;

#[derive(Debug, Clone)]
pub struct StellarKeypair {
    pub public_key: String, // G...
    pub secret_key: String, // S...
}

#[derive(Clone)]
pub struct StellarClient {
    horizon_url: String,
    friendbot_url: String,
    http: reqwest::Client,
}

#[derive(Debug, Deserialize)]
struct FriendbotResponse {
    hash: Option<String>,
}

#[derive(Debug, Deserialize)]
struct HorizonAccount {
    balances: Vec<HorizonBalance>,
}

#[derive(Debug, Deserialize)]
struct HorizonBalance {
    balance: String,
    asset_type: String,
}

impl StellarClient {
    pub fn new(horizon_url: String, friendbot_url: String) -> Self {
        Self {
            horizon_url,
            friendbot_url,
            http: reqwest::Client::new(),
        }
    }

    /// Generate a brand-new Stellar keypair (ed25519, strkey-encoded).
    pub fn generate_keypair() -> StellarKeypair {
        let mut csprng = OsRng;
        let signing_key = SigningKey::generate(&mut csprng);
        let secret_bytes: [u8; 32] = signing_key.to_bytes();
        let public_bytes: [u8; 32] = signing_key.verifying_key().to_bytes();

        let public_key = encode_strkey(VersionByte::PublicKey, &public_bytes);
        let secret_key = encode_strkey(VersionByte::SecretSeed, &secret_bytes);

        StellarKeypair {
            public_key,
            secret_key,
        }
    }

    /// Fund a testnet account using Friendbot. Returns the funding tx hash.
    pub async fn fund_with_friendbot(&self, public_key: &str) -> anyhow::Result<Option<String>> {
        let url = format!("{}/?addr={}", self.friendbot_url, public_key);
        let resp = self.http.get(url).send().await?;
        if !resp.status().is_success() {
            // Account may already be funded — not fatal for the demo.
            tracing::warn!("friendbot funding returned status {}", resp.status());
            return Ok(None);
        }
        let body: FriendbotResponse = resp.json().await.unwrap_or(FriendbotResponse { hash: None });
        Ok(body.hash)
    }

    /// Fetch the native XLM balance for an account from Horizon.
    /// Returns "0" if the account is not yet funded / found.
    pub async fn get_native_balance(&self, public_key: &str) -> anyhow::Result<String> {
        let url = format!("{}/accounts/{}", self.horizon_url, public_key);
        let resp = self.http.get(url).send().await?;
        if !resp.status().is_success() {
            return Ok("0".to_string());
        }
        let account: HorizonAccount = resp.json().await?;
        let native = account
            .balances
            .into_iter()
            .find(|b| b.asset_type == "native")
            .map(|b| b.balance)
            .unwrap_or_else(|| "0".to_string());
        Ok(native)
    }
}

#[derive(Clone, Copy)]
enum VersionByte {
    PublicKey,
    SecretSeed,
}

impl VersionByte {
    fn value(self) -> u8 {
        match self {
            // Stellar StrKey version bytes: 6 << 3 = G..., 18 << 3 = S...
            VersionByte::PublicKey => 6 << 3,
            VersionByte::SecretSeed => 18 << 3,
        }
    }
}

fn encode_strkey(version: VersionByte, payload: &[u8; 32]) -> String {
    let mut raw = Vec::with_capacity(35);
    raw.push(version.value());
    raw.extend_from_slice(payload);
    let crc = crc16_xmodem(&raw);
    raw.extend_from_slice(&crc.to_le_bytes());
    base32_encode_no_padding(&raw)
}

fn crc16_xmodem(data: &[u8]) -> u16 {
    let mut crc: u16 = 0;
    for byte in data {
        crc ^= (*byte as u16) << 8;
        for _ in 0..8 {
            if crc & 0x8000 != 0 {
                crc = (crc << 1) ^ 0x1021;
            } else {
                crc <<= 1;
            }
        }
    }
    crc
}

fn base32_encode_no_padding(data: &[u8]) -> String {
    const ALPHABET: &[u8; 32] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let mut out = String::with_capacity((data.len() * 8 + 4) / 5);
    let mut buffer: u32 = 0;
    let mut bits_left = 0u8;

    for byte in data {
        buffer = (buffer << 8) | (*byte as u32);
        bits_left += 8;
        while bits_left >= 5 {
            let index = ((buffer >> (bits_left - 5)) & 0x1f) as usize;
            out.push(ALPHABET[index] as char);
            bits_left -= 5;
        }
    }

    if bits_left > 0 {
        let index = ((buffer << (5 - bits_left)) & 0x1f) as usize;
        out.push(ALPHABET[index] as char);
    }

    out
}
