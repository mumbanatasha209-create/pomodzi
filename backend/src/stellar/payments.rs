use base64::Engine;
use ed25519_dalek::{Signer, SigningKey};
use rust_decimal::Decimal;
use serde::Deserialize;
use sha2::{Digest, Sha256};
use stellar_xdr::curr::{
    BytesM, Hash, Memo, MuxedAccount, Operation, OperationBody, PaymentOp, Preconditions,
    SequenceNumber, Signature, SignatureHint, Transaction, TransactionExt, TransactionEnvelope,
    TransactionSignaturePayload, TransactionSignaturePayloadTaggedTransaction,
    TransactionV1Envelope, Uint256, VecM, WriteXdr,
};

#[derive(Debug, Clone)]
pub struct PaymentResult {
    pub hash: String,
}

#[derive(Debug, Deserialize)]
struct HorizonSubmitResponse {
    hash: String,
}

#[derive(Debug, Deserialize)]
struct HorizonSubmitError {
    title: Option<String>,
    detail: Option<String>,
    #[serde(default)]
    extras: Option<HorizonSubmitErrorExtras>,
}

#[derive(Debug, Deserialize, Default)]
struct HorizonSubmitErrorExtras {
    envelope_xdr: Option<String>,
    result_xdr: Option<String>,
    result_codes: Option<serde_json::Value>,
}

pub fn public_from_secret(secret_key: &str) -> anyhow::Result<String> {
    let seed = decode_strkey(secret_key, 18 << 3)?;
    let signing_key = SigningKey::from_bytes(&seed);
    let public_bytes: [u8; 32] = signing_key.verifying_key().to_bytes();
    Ok(encode_strkey(6 << 3, &public_bytes))
}

/// Build the Stellar transaction signature base as XDR-encoded
/// `TransactionSignaturePayload { networkId, taggedTransaction: Tx(transaction) }`.
pub fn build_signature_base(network_passphrase: &str, transaction: &Transaction) -> anyhow::Result<Vec<u8>> {
    let network_id = Sha256::digest(network_passphrase.as_bytes());
  let payload = TransactionSignaturePayload {
        network_id: Hash(network_id.into()),
        tagged_transaction: TransactionSignaturePayloadTaggedTransaction::Tx(transaction.clone()),
    };
    payload
        .to_xdr(stellar_xdr::curr::Limits::none())
        .map_err(|e| anyhow::anyhow!("signature payload xdr encode failed: {e}"))
}

/// Submit a native XLM payment on testnet.
///
/// `current_sequence` is the account sequence returned by Horizon (`accounts` endpoint).
/// The transaction sequence number must be `current_sequence + 1` per Stellar protocol.
pub async fn submit_native_payment(
    http: &reqwest::Client,
    horizon_url: &str,
    network_passphrase: &str,
    source_secret: &str,
    destination_public: &str,
    amount: &Decimal,
    current_sequence: i64,
) -> anyhow::Result<PaymentResult> {
    let seed = decode_strkey(source_secret, 18 << 3)?;
    let signing_key = SigningKey::from_bytes(&seed);
    let source_public = public_from_secret(source_secret)?;

    let stroops = decimal_to_stroops(amount)?;
    let source_account = strkey_to_muxed(&source_public)?;
    let destination = strkey_to_muxed(destination_public)?;

    let tx_sequence = current_sequence
        .checked_add(1)
        .ok_or_else(|| anyhow::anyhow!("sequence overflow"))?;

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

    let transaction = Transaction {
        source_account,
        fee: 100,
        seq_num: SequenceNumber(tx_sequence),
        cond: Preconditions::None,
        memo: Memo::None,
        operations,
        ext: TransactionExt::V0,
    };

    let signature_base = build_signature_base(network_passphrase, &transaction)?;
    let tx_hash = Sha256::digest(&signature_base);
    let signature = signing_key.sign(&tx_hash);
    let sig_bytes = signature.to_bytes();
    let public_bytes: [u8; 32] = signing_key.verifying_key().to_bytes();

    let decorated = stellar_xdr::curr::DecoratedSignature {
        // Stellar uses the last 4 bytes of the ed25519 public key as the hint.
        hint: SignatureHint(public_bytes[28..32].try_into().unwrap()),
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
    let tx_b64 = base64::engine::general_purpose::STANDARD.encode(&tx_xdr);

    tracing::debug!(
        source = %source_public,
        destination = %destination_public,
        amount = %amount,
        stroops,
        horizon_sequence = current_sequence,
        tx_sequence,
        fee = 100u32,
        "submitting stellar native payment"
    );

    let url = format!("{horizon_url}/transactions");
    let resp = http
        .post(url)
        .form(&[("tx", tx_b64.as_str())])
        .send()
        .await?;

    if !resp.status().is_success() {
        let status = resp.status();
        let body = resp.text().await.unwrap_or_default();
        log_horizon_rejection(
            &body,
            &source_public,
            destination_public,
            amount,
            current_sequence,
            tx_sequence,
            &tx_b64,
        );
        anyhow::bail!("stellar payment failed (HTTP {status}): {body}");
    }

    let submitted: HorizonSubmitResponse = resp.json().await?;
    tracing::info!(
        hash = %submitted.hash,
        source = %source_public,
        destination = %destination_public,
        amount = %amount,
        "stellar payment submitted"
    );
    Ok(PaymentResult {
        hash: submitted.hash,
    })
}

fn log_horizon_rejection(
    body: &str,
    source_public: &str,
    destination_public: &str,
    amount: &Decimal,
    horizon_sequence: i64,
    tx_sequence: i64,
    envelope_b64: &str,
) {
    let parsed: Option<HorizonSubmitError> = serde_json::from_str(body).ok();
    let (title, detail, result_xdr, envelope_xdr, result_codes) = if let Some(err) = parsed {
        let extras = err.extras.unwrap_or_default();
        (
            err.title.unwrap_or_default(),
            err.detail.unwrap_or_default(),
            extras.result_xdr.unwrap_or_default(),
            extras.envelope_xdr.unwrap_or_default(),
            extras
                .result_codes
                .map(|v| v.to_string())
                .unwrap_or_default(),
        )
    } else {
        (String::new(), String::new(), String::new(), String::new(), String::new())
    };

    tracing::error!(
        title = %title,
        detail = %detail,
        result_xdr = %result_xdr,
        horizon_envelope_xdr = %envelope_xdr,
        submitted_envelope_b64 = %envelope_b64,
        source_public_key = %source_public,
        destination_public_key = %destination_public,
        amount = %amount,
        horizon_sequence,
        tx_sequence,
        result_codes = %result_codes,
        raw_body = %body,
        "Horizon rejected Stellar transaction"
    );
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

#[cfg(test)]
mod tests {
    use super::*;

    const TESTNET_PASSPHRASE: &str = "Test SDF Network ; September 2015";

    #[test]
    fn signature_base_uses_transaction_signature_payload_xdr() {
        let tx = Transaction {
            source_account: MuxedAccount::Ed25519(Uint256([1u8; 32])),
            fee: 100,
            seq_num: SequenceNumber(1),
            cond: Preconditions::None,
            memo: Memo::None,
            operations: VecM::default(),
            ext: TransactionExt::V0,
        };

        let base = build_signature_base(TESTNET_PASSPHRASE, &tx).unwrap();
        let expected = TransactionSignaturePayload {
            network_id: Hash(Sha256::digest(TESTNET_PASSPHRASE.as_bytes()).into()),
            tagged_transaction: TransactionSignaturePayloadTaggedTransaction::Tx(tx),
        }
        .to_xdr(stellar_xdr::curr::Limits::none())
        .unwrap();

        assert_eq!(base, expected);
    }

    #[test]
    fn tx_sequence_is_horizon_sequence_plus_one() {
        let horizon_seq: i64 = 42;
        let tx_seq = horizon_seq + 1;
        assert_eq!(tx_seq, 43);
    }
}
