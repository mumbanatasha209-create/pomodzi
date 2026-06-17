use base64::Engine;
use ed25519_dalek::{Signer, SigningKey};
use rust_decimal::Decimal;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use stellar_xdr::curr::{
    BytesM, Memo, MuxedAccount, Operation, OperationBody, PaymentOp, Preconditions,
    SequenceNumber, Signature, SignatureHint, TimeBounds, TimePoint, Transaction, TransactionExt,
    TransactionEnvelope, TransactionV1Envelope, Uint256, VecM, WriteXdr,
};

#[derive(Debug, Clone)]
pub struct PaymentResult {
    pub hash: String,
}

#[derive(Debug, Deserialize)]
struct HorizonSubmitResponse {
    hash: String,
}

pub fn public_from_secret(secret_key: &str) -> anyhow::Result<String> {
    let seed = decode_strkey(secret_key, 18 << 3)?;
    let signing_key = SigningKey::from_bytes(&seed);
    let public_bytes: [u8; 32] = signing_key.verifying_key().to_bytes();
    Ok(encode_strkey(6 << 3, &public_bytes))
}

pub async fn submit_native_payment(
    http: &reqwest::Client,
    horizon_url: &str,
    network_passphrase: &str,
    source_secret: &str,
    destination_public: &str,
    amount: &Decimal,
    sequence: i64,
) -> anyhow::Result<PaymentResult> {
    let seed = decode_strkey(source_secret, 18 << 3)?;
    let signing_key = SigningKey::from_bytes(&seed);
    let source_public = public_from_secret(source_secret)?;

    let stroops = decimal_to_stroops(amount)?;
    let source_account = strkey_to_muxed(&source_public)?;
    let destination = strkey_to_muxed(destination_public)?;

    let payment_op = Operation {
        source_account: None,
        body: OperationBody::Payment(PaymentOp {
            destination,
            asset: stellar_xdr::curr::Asset::Native,
            amount: stroops,
        }),
    };

    let operations: VecM<Operation, 100> = vec![payment_op]
        .try_into()
        .map_err(|_| anyhow::anyhow!("too many operations"))?;

    let now = std::time::SystemTime::now()
        .duration_since(std::time::UNIX_EPOCH)?
        .as_secs();

    let transaction = Transaction {
        source_account,
        fee: 100,
        seq_num: SequenceNumber(sequence + 1),
        cond: Preconditions::Time(TimeBounds {
            min_time: TimePoint(0),
            max_time: TimePoint(now + 300),
        }),
        memo: Memo::None,
        operations,
        ext: TransactionExt::V0,
    };

    let network_id = Sha256::digest(network_passphrase.as_bytes());
    let mut signature_base = Vec::new();
    signature_base.extend_from_slice(&network_id);
    signature_base.extend_from_slice(
        &transaction
            .to_xdr(stellar_xdr::curr::Limits::none())
            .map_err(|e| anyhow::anyhow!("xdr encode failed: {e}"))?,
    );
    let tx_hash = Sha256::digest(&signature_base);
    let signature = signing_key.sign(&tx_hash);
    let sig_bytes = signature.to_bytes();

    let decorated = stellar_xdr::curr::DecoratedSignature {
        hint: SignatureHint(sig_bytes[..4].try_into().unwrap()),
        signature: Signature(
            BytesM::<64>::try_from(sig_bytes.as_slice())
                .map_err(|_| anyhow::anyhow!("invalid signature length"))?,
        ),
    };

    let signatures: VecM<stellar_xdr::curr::DecoratedSignature, 20> = vec![decorated]
        .try_into()
        .map_err(|_| anyhow::anyhow!("too many signatures"))?;

    let envelope = TransactionEnvelope::Tx(TransactionV1Envelope {
        tx: transaction,
        signatures,
    });

    let tx_xdr = envelope
        .to_xdr(stellar_xdr::curr::Limits::none())
        .map_err(|e| anyhow::anyhow!("xdr encode failed: {e}"))?;
    let tx_b64 = base64::engine::general_purpose::STANDARD.encode(tx_xdr);

    let url = format!("{horizon_url}/transactions");
    let resp = http
        .post(url)
        .form(&[("tx", tx_b64.as_str())])
        .send()
        .await?;

    if !resp.status().is_success() {
        let body = resp.text().await.unwrap_or_default();
        anyhow::bail!("stellar payment failed: {body}");
    }

    let submitted: HorizonSubmitResponse = resp.json().await?;
    Ok(PaymentResult {
        hash: submitted.hash,
    })
}

fn decimal_to_stroops(amount: &Decimal) -> anyhow::Result<i64> {
    let scaled = amount * Decimal::from(10_000_000i64);
    scaled
        .round_dp(0)
        .to_string()
        .parse::<i64>()
        .map_err(|_| anyhow::anyhow!("invalid payment amount"))
}

fn strkey_to_muxed(public_key: &str) -> anyhow::Result<MuxedAccount> {
    let bytes = decode_strkey(public_key, 6 << 3)?;
    Ok(MuxedAccount::Ed25519(Uint256(bytes)))
}

fn decode_strkey(value: &str, expected_version: u8) -> anyhow::Result<[u8; 32]> {
    let decoded = base32_decode(value)?;
    if decoded.is_empty() || decoded[0] != expected_version {
        anyhow::bail!("invalid strkey version");
    }
    let payload = &decoded[1..33];
    let mut out = [0u8; 32];
    out.copy_from_slice(payload);
    Ok(out)
}

fn encode_strkey(version: u8, payload: &[u8; 32]) -> String {
    let mut raw = Vec::with_capacity(35);
    raw.push(version);
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

fn base32_decode(input: &str) -> anyhow::Result<Vec<u8>> {
    const ALPHABET: &[u8; 32] = b"ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";
    let mut buffer: u32 = 0;
    let mut bits_left = 0u8;
    let mut out = Vec::new();
    for ch in input.chars() {
        let val = ALPHABET
            .iter()
            .position(|&c| c as char == ch)
            .ok_or_else(|| anyhow::anyhow!("invalid base32 character"))? as u32;
        buffer = (buffer << 5) | val;
        bits_left += 5;
        if bits_left >= 8 {
            bits_left -= 8;
            out.push((buffer >> bits_left) as u8);
            buffer &= (1 << bits_left) - 1;
        }
    }
    Ok(out)
}
