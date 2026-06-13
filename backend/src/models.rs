use bigdecimal::BigDecimal;
use chrono::{DateTime, Utc};
use serde::{Deserialize, Serialize};
use sqlx::FromRow;
use uuid::Uuid;

// NOTE: PostgreSQL enum columns are read/written as `TEXT` (via `::text`
// casts in SQL) to keep the SQLx layer simple and robust. Validation of the
// allowed values happens in the handlers.

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
    // Secret key is NEVER serialized to the client by default.
    #[serde(skip_serializing)]
    pub stellar_secret_key: Option<String>,
    pub created_at: DateTime<Utc>,
    pub updated_at: DateTime<Utc>,
}

/// Public-facing view of a user (no secrets).
#[derive(Debug, Clone, Serialize)]
pub struct UserPublic {
    pub id: Uuid,
    pub full_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub role: String,
    pub stellar_public_key: Option<String>,
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
    pub contribution_amount: BigDecimal,
    pub currency: String,
    pub frequency: String,
    pub current_cycle: i32,
    pub status: String,
    pub invite_code: String,
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

/// Member joined with user details + current-cycle contribution status.
#[derive(Debug, Clone, Serialize, FromRow)]
pub struct MemberView {
    pub user_id: Uuid,
    pub full_name: String,
    pub email: String,
    pub rotation_order: i32,
    pub has_received_payout: bool,
    pub stellar_public_key: Option<String>,
    pub contribution_status: String, // 'paid' | 'pending'
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Contribution {
    pub id: Uuid,
    pub group_id: Uuid,
    pub user_id: Uuid,
    pub cycle: i32,
    pub amount: BigDecimal,
    pub status: String,
    pub stellar_tx_hash: Option<String>,
    pub paid_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Payout {
    pub id: Uuid,
    pub group_id: Uuid,
    pub cycle: i32,
    pub recipient_id: Uuid,
    pub amount: BigDecimal,
    pub status: String,
    pub stellar_tx_hash: Option<String>,
    pub paid_at: Option<DateTime<Utc>>,
    pub created_at: DateTime<Utc>,
}

#[derive(Debug, Clone, Serialize, FromRow)]
pub struct Transaction {
    pub id: Uuid,
    pub user_id: Option<Uuid>,
    pub group_id: Option<Uuid>,
    pub tx_type: String,
    pub amount: BigDecimal,
    pub currency: String,
    pub status: String,
    pub stellar_tx_hash: Option<String>,
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

// ----------------------- Request / response DTOs -----------------------

#[derive(Debug, Deserialize)]
pub struct RegisterRequest {
    pub full_name: String,
    pub email: String,
    pub phone: Option<String>,
    pub password: String,
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
    pub contribution_amount: f64,
    pub frequency: String, // 'weekly' | 'monthly'
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
    /// Optional: defaults to the group's configured contribution amount.
    pub amount: Option<f64>,
}
