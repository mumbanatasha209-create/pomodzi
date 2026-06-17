//! Stellar **testnet** integration.
//!
//! Testnet-only operations: keypair generation, Friendbot funding, Horizon balance
//! reads, and native XLM payment submission.

mod payments;

use ed25519_dalek::SigningKey;
use payments::submit_native_payment;
use rand::rngs::OsRng;
use rust_decimal::Decimal;
use serde::Deserialize;

pub use payments::PaymentResult;

#[derive(Debug, Clone)]
pub struct StellarKeypair {
    pub public_key: String,
    pub secret_key: String,
}

#[derive(Clone)]
pub struct StellarClient {
    horizon_url: String,
    friendbot_url: String,
    network_passphrase: String,
    http: reqwest::Client,
}

#[derive(Debug, Deserialize)]
struct FriendbotResponse {
    hash: Option<String>,
}

#[derive(Debug, Deserialize)]
struct HorizonAccount {
    sequence: String,
    balances: Vec<HorizonBalance>,
}

#[derive(Debug, Deserialize)]
struct HorizonBalance {
    balance: String,
    asset_type: String,
}

#[derive(Debug, Deserialize)]
struct HorizonTxResponse {
    hash: String,
    successful: bool,
}

impl StellarClient {
    pub fn new(horizon_url: String, friendbot_url: String, network_passphrase: String) -> Self {
        Self {
            horizon_url,
            friendbot_url,
            network_passphrase,
            http: reqwest::Client::new(),
        }
    }

    pub fn generate_keypair() -> StellarKeypair {
        let mut csprng = OsRng;
        let signing_key = SigningKey::generate(&mut csprng);
        let secret_bytes: [u8; 32] = signing_key.to_bytes();
        let public_bytes: [u8; 32] = signing_key.verifying_key().to_bytes();

        StellarKeypair {
            public_key: encode_strkey(VersionByte::PublicKey, &public_bytes),
            secret_key: encode_strkey(VersionByte::SecretSeed, &secret_bytes),
        }
    }

    pub async fn fund_with_friendbot(&self, public_key: &str) -> anyhow::Result<Option<String>> {
        let url = format!("{}/?addr={}", self.friendbot_url, public_key);
        let resp = self.http.get(url).send().await?;
        if !resp.status().is_success() {
            tracing::warn!("friendbot funding returned status {}", resp.status());
            return Ok(None);
        }
        let body: FriendbotResponse = resp.json().await.unwrap_or(FriendbotResponse { hash: None });
        Ok(body.hash)
    }

    pub async fn get_native_balance(&self, public_key: &str) -> anyhow::Result<String> {
        let account = self.fetch_account(public_key).await?;
        Ok(account
            .balances
            .into_iter()
            .find(|b| b.asset_type == "native")
            .map(|b| b.balance)
            .unwrap_or_else(|| "0".to_string()))
    }

    pub async fn fetch_account(&self, public_key: &str) -> anyhow::Result<HorizonAccount> {
        let url = format!("{}/accounts/{}", self.horizon_url, public_key);
        let resp = self.http.get(url).send().await?;
        if !resp.status().is_success() {
            anyhow::bail!("account {public_key} not found on testnet");
        }
        Ok(resp.json().await?)
    }

    /// Submit a native XLM payment on Stellar testnet and return the on-chain hash.
    pub async fn send_native_payment(
        &self,
        source_secret: &str,
        destination_public: &str,
        amount: &Decimal,
    ) -> anyhow::Result<PaymentResult> {
        let account = self
            .fetch_account(&payments::public_from_secret(source_secret)?)
            .await?;
        let sequence: i64 = account.sequence.parse()?;
        submit_native_payment(
            &self.http,
            &self.horizon_url,
            &self.network_passphrase,
            source_secret,
            destination_public,
            amount,
            sequence,
        )
        .await
    }

    pub async fn verify_transaction(&self, tx_hash: &str) -> anyhow::Result<bool> {
        let url = format!("{}/transactions/{}", self.horizon_url, tx_hash);
        let resp = self.http.get(url).send().await?;
        if !resp.status().is_success() {
            return Ok(false);
        }
        let body: HorizonTxResponse = resp.json().await?;
        Ok(body.successful)
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
