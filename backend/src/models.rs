use rust_decimal::Decimal;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

pub const USER_COLUMNS: &str = r#"id, full_name, email, phone, password_hash, role::text AS role,
    stellar_public_key, stellar_secret_key, country, phone_country_code,
    preferred_currency, timezone, created_at, updated_at"#;

pub const GROUP_COLUMNS: &str = r#"id, name, description, admin_id, contribution_amount, currency,
    frequency::text AS frequency, current_cycle, status::text AS status,
    invite_code, treasury_public_key, treasury_secret_key,
    primary_country, settlement_asset, timezone, created_at, updated_at"#;

pub const GROUP_SELECT: &str = concat!(
    "SELECT ",
    "id, name, description, admin_id, contribution_amount, currency, \
    frequency::text AS frequency, current_cycle, status::text AS status, \
    invite_code, treasury_public_key, treasury_secret_key, \
    primary_country, settlement_asset, timezone, created_at, updated_at",
    " FROM savings_groups"
);

pub const GROUP_SELECT_BY_ID: &str = concat!(
    "SELECT ",
    "id, name, description, admin_id, contribution_amount, currency, \
    frequency::text AS frequency, current_cycle, status::text AS status, \
    invite_code, treasury_public_key, treasury_secret_key, \
    primary_country, settlement_asset, timezone, created_at, updated_at",
    " FROM savings_groups WHERE id = $1"
);

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct User {
    pub id: Uuid,
    pub full_name: String,
    pub email: String,
    pub phone: Option<String>,
    #[serde(skip_serializing)]
    pub password_hash: String,
    pub role: String,
    pub stellar_public_key: Option<String>,
    #[serde(skip_serializing)]
    pub stellar_secret_key: Option<String>,
    pub country: Option<String>,
    pub phone_country_code: Option<String>,
    pub preferred_currency: String,
    pub timezone: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize)]
pub struct UserPublic {
    pub id: Uuid,
    pub full_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub role: String,
    pub stellar_public_key: Option<String>,
    pub country: Option<String>,
    pub preferred_currency: String,
    pub timezone: String,
    pub created_at: DateTime<Utc>,
}

impl From<User> for UserPublic {
    fn from(u: User) -> Self {
        UserPublic {
            id: u.id,
            full_name: u.full_name,
            email: u.email,
            phone: u.phone,
            role: u.role,
            stellar_public_key: u.stellar_public_key,
            country: u.country,
            preferred_currency: u.preferred_currency,
            timezone: u.timezone,
            created_at: u.created_at,
        }
    }
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct SavingsGroup {
    pub id: Uuid,
    pub name: String,
    pub description: Option<String>,
    pub admin_id: Uuid,
    pub contribution_amount: Decimal,
    pub currency: String,
    pub frequency: String,
    pub current_cycle: i32,
    pub status: String,
    pub invite_code: String,
    pub treasury_public_key: Option<String>,
    #[serde(skip_serializing)]
    pub treasury_secret_key: Option<String>,
    pub primary_country: Option<String>,
    pub settlement_asset: String,
    pub timezone: String,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct GroupMember {
    pub id: Uuid,
    pub group_id: Uuid,
    pub user_id: Uuid,
    pub rotation_order: i32,
    pub status: String,
    pub has_received_payout: bool,
    pub joined_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct MemberView {
    pub user_id: Uuid,
    pub full_name: String,
    pub email: String,
    pub rotation_order: i32,
    pub has_received_payout: bool,
    pub stellar_public_key: Option<String>,
    pub contribution_status: String,
}

pub const CONTRIBUTION_COLUMNS: &str = r#"id, group_id, user_id, cycle, amount, status::text AS status,
    blockchain_hash, transaction_source::text AS transaction_source, paid_at, created_at,
    original_currency, settlement_currency, exchange_rate_used, payment_provider, payment_country"#;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Contribution {
    pub id: Uuid,
    pub group_id: Uuid,
    pub user_id: Uuid,
    pub cycle: i32,
    pub amount: Decimal,
    pub status: String,
    pub blockchain_hash: Option<String>,
    pub transaction_source: String,
    pub paid_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub original_currency: Option<String>,
    pub settlement_currency: Option<String>,
    pub exchange_rate_used: Option<Decimal>,
    pub payment_provider: Option<String>,
    pub payment_country: Option<String>,
}

pub const PAYOUT_COLUMNS: &str = r#"id, group_id, cycle, recipient_id, amount, status::text AS status,
    blockchain_hash, transaction_source::text AS transaction_source, paid_at, created_at,
    payout_country, payout_provider, original_currency, settlement_currency"#;

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Payout {
    pub id: Uuid,
    pub group_id: Uuid,
    pub cycle: i32,
    pub recipient_id: Uuid,
    pub amount: Decimal,
    pub status: String,
    pub blockchain_hash: Option<String>,
    pub transaction_source: String,
    pub paid_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
    pub payout_country: Option<String>,
    pub payout_provider: Option<String>,
    pub original_currency: Option<String>,
    pub settlement_currency: Option<String>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Transaction {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub group_id: Option<Uuid>,
    pub tx_type: String,
    pub amount: Decimal,
    pub currency: String,
    pub status: String,
    pub blockchain_hash: Option<String>,
    pub transaction_source: String,
    pub memo: Option<String>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Notification {
    pub id: Uuid,
    pub user_id: Uuid,
    pub title: String,
    pub message: String,
    pub is_read: bool,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct AuditLog {
    pub id: Uuid,
    pub actor_id: Option<Uuid>,
    pub action: String,
    pub entity_type: String,
    pub entity_id: Option<String>,
    pub metadata: serde_json::Value,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub full_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub phone_country_code: Option<String>,
    pub country: Option<String>,
    pub password: String,
    #[serde(default)]
    pub confirm_password: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct LoginRequest {
    pub email: String,
    pub password: String,
}

#[derive(Debug, Serialize)]
pub struct AuthResponse {
    pub token: String,
    pub user: UserPublic,
}

#[derive(Debug, Deserialize)]
pub struct CreateGroupRequest {
    pub name: String,
    pub description: Option<String>,
    /// Money amount as a decimal string, e.g. "10.50"
    pub contribution_amount: String,
    pub frequency: String,
    #[serde(default)]
    pub primary_country: Option<String>,
    #[serde(default)]
    pub currency: Option<String>,
    #[serde(default)]
    pub settlement_asset: Option<String>,
    #[serde(default)]
    pub timezone: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct JoinGroupRequest {
    pub invite_code: String,
}

#[derive(Debug, Deserialize)]
pub struct AddMemberRequest {
    pub email: String,
}

#[derive(Debug, Deserialize)]
pub struct RotationItem {
    pub user_id: Uuid,
    pub rotation_order: i32,
}

#[derive(Debug, Deserialize)]
pub struct SetRotationRequest {
    pub order: Vec<RotationItem>,
}

#[derive(Debug, Deserialize)]
pub struct ContributeRequest {
    /// Required decimal string matching the group's contribution_amount exactly.
    pub amount: String,
    #[serde(default)]
    pub payment_provider: Option<String>,
}

pub fn parse_money(input: &str) -> Result<Decimal, String> {
    use std::str::FromStr;
    Decimal::from_str(input.trim()).map_err(|_| "Invalid money amount".to_string())
}
