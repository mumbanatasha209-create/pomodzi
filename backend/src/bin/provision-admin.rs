//! Secure platform-admin provisioning CLI.
//!
//! Usage:
//!   cargo run --bin provision-admin -- create --email admin@example.com --password '...' --full-name 'Admin User'
//!   cargo run --bin provision-admin -- promote --email admin@example.com
//!   cargo run --bin provision-admin -- encrypt-secrets

use anyhow::Result;
use clap::{Parser, Subcommand};
use pamodzi_backend::{
    auth::password,
    config::Config,
    crypto::KeyEncryption,
    db,
    handlers::encrypt_secret,
    stellar::StellarClient,
};
use sqlx::PgPool;
use uuid::Uuid;

#[derive(Parser)]
#[command(name = "provision-admin", about = "Provision Pamodzi platform administrators securely")]
struct Cli {
    #[command(subcommand)]
    command: Commands,
}

#[derive(Subcommand)]
enum Commands {
    /// Create a new platform_admin user (or promote if email already exists).
    Create {
        #[arg(long)]
        email: String,
        #[arg(long)]
        password: String,
        #[arg(long)]
        full_name: String,
        #[arg(long)]
        phone: Option<String>,
    },
    /// Promote an existing registered user to platform_admin.
    Promote {
        #[arg(long)]
        email: String,
    },
    /// Encrypt any plaintext Stellar secret keys still stored in the database.
    EncryptSecrets,
}

#[tokio::main]
async fn main() -> Result<()> {
    tracing_subscriber::fmt::init();
    let cli = Cli::parse();
    let config = Config::from_env()?;
    let pool = db::init_pool(&config.database_url).await?;
    let crypto = KeyEncryption::from_key_bytes(&config.encryption_key);

    match cli.command {
        Commands::Create {
            email,
            password,
            full_name,
            phone,
        } => create_admin(&pool, &crypto, &email, &password, &full_name, phone.as_deref()).await?,
        Commands::Promote { email } => promote_admin(&pool, &email).await?,
        Commands::EncryptSecrets => encrypt_all_secrets(&pool, &crypto).await?,
    }

    Ok(())
}

async fn create_admin(
    pool: &PgPool,
    crypto: &KeyEncryption,
    email: &str,
    password: &str,
    full_name: &str,
    phone: Option<&str>,
) -> Result<()> {
    let email = email.trim().to_lowercase();
    let existing = sqlx::query_scalar::<_, Option<Uuid>>("SELECT id FROM users WHERE email = $1")
        .bind(&email)
        .fetch_optional(pool)
        .await?
        .flatten();

    if let Some(id) = existing {
        promote_admin(pool, &email).await?;
        println!("User {email} already existed — promoted to platform_admin (id={id})");
        return Ok(());
    }

    let password_hash = password::hash_password(password)?;
    let keypair = StellarClient::generate_keypair();
    let encrypted_secret = encrypt_secret(crypto, &keypair.secret_key)
        .map_err(|e| anyhow::anyhow!(e.to_string()))?;

    let id = sqlx::query_scalar::<_, Uuid>(
        r#"INSERT INTO users
            (full_name, email, phone, password_hash, role, stellar_public_key, stellar_secret_key)
           VALUES ($1, $2, $3, $4, 'platform_admin'::user_role, $5, $6)
           RETURNING id"#,
    )
    .bind(full_name.trim())
    .bind(&email)
    .bind(phone)
    .bind(&password_hash)
    .bind(&keypair.public_key)
    .bind(&encrypted_secret)
    .fetch_one(pool)
    .await?;

    println!("Created platform_admin {email} (id={id})");
    Ok(())
}

async fn promote_admin(pool: &PgPool, email: &str) -> Result<()> {
    let email = email.trim().to_lowercase();
    let updated = sqlx::query(
        "UPDATE users SET role = 'platform_admin'::user_role, updated_at = now() WHERE email = $1",
    )
    .bind(&email)
    .execute(pool)
    .await?;

    if updated.rows_affected() == 0 {
        anyhow::bail!("No user found with email {email}");
    }
    println!("Promoted {email} to platform_admin");
    Ok(())
}

async fn encrypt_all_secrets(pool: &PgPool, crypto: &KeyEncryption) -> Result<()> {
    let users = sqlx::query_as::<_, (Uuid, Option<String>)>(
        "SELECT id, stellar_secret_key FROM users WHERE stellar_secret_key IS NOT NULL",
    )
    .fetch_all(pool)
    .await?;

    let mut user_count = 0;
    for (id, secret) in users {
        let Some(secret) = secret else { continue };
        if KeyEncryption::is_encrypted(&secret) {
            continue;
        }
        let encrypted = encrypt_secret(crypto, &secret).map_err(|e| anyhow::anyhow!(e.to_string()))?;
        sqlx::query("UPDATE users SET stellar_secret_key = $1 WHERE id = $2")
            .bind(&encrypted)
            .bind(id)
            .execute(pool)
            .await?;
        user_count += 1;
    }

    let groups = sqlx::query_as::<_, (Uuid, Option<String>)>(
        "SELECT id, treasury_secret_key FROM savings_groups WHERE treasury_secret_key IS NOT NULL",
    )
    .fetch_all(pool)
    .await?;

    let mut group_count = 0;
    for (id, secret) in groups {
        let Some(secret) = secret else { continue };
        if KeyEncryption::is_encrypted(&secret) {
            continue;
        }
        let encrypted = encrypt_secret(crypto, &secret).map_err(|e| anyhow::anyhow!(e.to_string()))?;
        sqlx::query("UPDATE savings_groups SET treasury_secret_key = $1 WHERE id = $2")
            .bind(&encrypted)
            .bind(id)
            .execute(pool)
            .await?;
        group_count += 1;
    }

    println!("Encrypted {user_count} user secrets and {group_count} treasury secrets");
    Ok(())
}
