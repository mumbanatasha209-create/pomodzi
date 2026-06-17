//! Live Stellar testnet signing verification (run with `cargo test --test stellar_signing_test -- --ignored --nocapture`)

use ed25519_dalek::SigningKey;
use pamodzi_backend::stellar::StellarClient;
use rust_decimal::Decimal;
use std::str::FromStr;
use stellar_strkey::ed25519;

#[test]
fn generated_keypair_matches_stellar_strkey() {
    let kp = StellarClient::generate_keypair();
    let sk = ed25519::PrivateKey::from_string(&kp.secret_key).expect("decode secret");
    let pk = ed25519::PublicKey::from_string(&kp.public_key).expect("decode public");
    let signing = SigningKey::from_bytes(&sk.0);
    let derived: [u8; 32] = signing.verifying_key().to_bytes();
    assert_eq!(derived, pk.0);
    assert_eq!(
        pamodzi_backend::stellar::public_from_secret(&kp.secret_key).unwrap(),
        kp.public_key
    );
}

#[tokio::test]
#[ignore = "hits Stellar testnet"]
async fn live_friendbot_payment_roundtrip() {
    let client = StellarClient::new(
        "https://horizon-testnet.stellar.org".into(),
        "https://friendbot.stellar.org".into(),
        "Test SDF Network ; September 2015".into(),
    );

    let sender = StellarClient::generate_keypair();
    let receiver = StellarClient::generate_keypair();

    client
        .fund_with_friendbot(&sender.public_key)
        .await
        .expect("friendbot sender");

    client
        .fund_with_friendbot(&receiver.public_key)
        .await
        .expect("friendbot receiver");

    tokio::time::sleep(std::time::Duration::from_secs(3)).await;

    let amount = Decimal::from_str("1.0").unwrap();
    let result = client
        .send_native_payment(&sender.secret_key, &receiver.public_key, &amount)
        .await
        .expect("payment should succeed");
    eprintln!("payment hash: {}", result.hash);

    assert!(client.verify_transaction(&result.hash).await.unwrap());
}
