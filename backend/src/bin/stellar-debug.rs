use ed25519_dalek::SigningKey;
use pamodzi_backend::crypto::KeyEncryption;
use pamodzi_backend::handlers::decrypt_secret;
use pamodzi_backend::stellar::public_from_secret;
use sqlx::PgPool;
use stellar_strkey::ed25519;

#[tokio::main]
async fn main() -> anyhow::Result<()> {
    dotenvy::dotenv().ok();
    let db_url = std::env::var("DATABASE_URL")
        .unwrap_or_else(|_| "postgres://postgres:postgres@localhost:5432/pamodzi".into());
    let enc_key =
        pamodzi_backend::security::parse_encryption_key(&std::env::var("ENCRYPTION_KEY")?)?;
    let crypto = KeyEncryption::from_key_bytes(&enc_key);
    let pool = PgPool::connect(&db_url).await?;

    let email = std::env::args()
        .nth(1)
        .unwrap_or_else(|| "alice+e2e1781693824@test.pamodzi.local".into());

    let row: (String, String) = sqlx::query_as(
        "SELECT stellar_public_key, stellar_secret_key FROM users WHERE email = $1",
    )
    .bind(&email)
    .fetch_one(&pool)
    .await?;

    let secret = decrypt_secret(&crypto, &row.1)?;
    let derived = public_from_secret(&secret)?;
    let sk = ed25519::PrivateKey::from_string(&secret)?;
    let signing = SigningKey::from_bytes(&sk.0);
    let strkey_pub = ed25519::PublicKey(signing.verifying_key().to_bytes());

    println!("email: {email}");
    println!("stored public:  {}", row.0);
    println!("derived public:  {derived}");
    println!("strkey public:   {}", strkey_pub.to_string());
    println!("match derived: {}", derived == row.0);
    println!("match strkey:  {}", strkey_pub.to_string() == row.0);
    println!("secret prefix: {}...", &secret[..10.min(secret.len())]);

    Ok(())
}
