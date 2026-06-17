// TypeScript types mirroring the Pamodzi Finance backend schema.

export type UserRole = "platform_admin" | "group_admin" | "member";
export type ContributionFrequency = "weekly" | "monthly";
export type GroupStatus = "active" | "completed" | "paused";
export type ContributionStatus = "pending" | "paid";
export type PayoutStatus = "pending" | "completed" | "failed";
export type TxType =
  | "wallet_funding"
  | "contribution"
  | "payout"
  | "transfer"
  | "treasury_deposit"
  | "cross_border_contribution"
  | "settlement_transfer";
export type TxSource =
  | "stellar_testnet"
  | "internal_ledger"
  | "mobile_money_demo"
  | "bank_transfer_demo";
export type TxStatus = "pending" | "success" | "failed";
export type InvitationStatus = "pending" | "accepted" | "declined";
export type MembershipStatus = "active" | "removed";

export interface User {
  id: string;
  full_name: string;
  email: string;
  phone?: string | null;
  role: UserRole;
  stellar_public_key?: string | null;
  country?: string | null;
  preferred_currency?: string;
  timezone?: string;
  created_at: string;
  updated_at?: string;
}

export interface SavingsGroup {
  id: string;
  name: string;
  description?: string | null;
  admin_id: string;
  contribution_amount: string | number;
  currency: string;
  frequency: ContributionFrequency;
  current_cycle: number;
  status: GroupStatus;
  invite_code: string;
  primary_country?: string | null;
  settlement_asset?: string;
  timezone?: string;
  created_at: string;
  updated_at: string;
  member_count?: number;
}

export interface GroupMember {
  id: string;
  group_id: string;
  user_id: string;
  rotation_order: number;
  status: MembershipStatus;
  has_received_payout: boolean;
  joined_at: string;
  full_name?: string;
  email?: string;
}

/** Member row returned by GET /api/groups/:id */
export interface MemberView {
  user_id: string;
  full_name: string;
  email: string;
  rotation_order: number;
  has_received_payout: boolean;
  stellar_public_key?: string | null;
  contribution_status: ContributionStatus;
}

export interface GroupListItem {
  group: SavingsGroup;
  member_count: number;
  is_admin: boolean;
}

export interface GroupDetailResponse {
  group: SavingsGroup;
  members: MemberView[];
  paid_count: number;
  total_members: number;
  all_paid: boolean;
  is_admin: boolean;
}

export interface ContributeResponse {
  contribution: Contribution;
  all_paid: boolean;
  payout_triggered: boolean;
}

export interface Contribution {
  id: string;
  group_id: string;
  user_id: string;
  cycle: number;
  amount: string | number;
  status: ContributionStatus;
  blockchain_hash?: string | null;
  transaction_source?: TxSource;
  paid_at?: string | null;
  created_at: string;
  original_currency?: string | null;
  settlement_currency?: string | null;
  payment_provider?: string | null;
  payment_country?: string | null;
  full_name?: string;
}

export interface Payout {
  id: string;
  group_id: string;
  cycle: number;
  recipient_id: string;
  amount: string | number;
  status: PayoutStatus;
  blockchain_hash?: string | null;
  transaction_source?: TxSource;
  paid_at?: string | null;
  created_at: string;
  payout_country?: string | null;
  payout_provider?: string | null;
  original_currency?: string | null;
  settlement_currency?: string | null;
  recipient_name?: string;
}

export interface Transaction {
  id: string;
  user_id?: string | null;
  group_id?: string | null;
  tx_type: TxType;
  amount: string | number;
  currency: string;
  status: TxStatus;
  blockchain_hash?: string | null;
  transaction_source?: TxSource;
  memo?: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  message: string;
  is_read: boolean;
  created_at: string;
}

export interface AuditLog {
  id: string;
  actor_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface Wallet {
  public_key: string;
  balance: string;
  asset: string;
  network: string;
  explorer_url: string;
}

export interface CountryStat {
  country: string | null;
  count: number;
}

export interface CurrencyVolume {
  currency: string;
  volume: string;
}

export interface ProviderUsage {
  provider: string | null;
  count: number;
}

export interface AdminStats {
  users: number;
  groups: number;
  active_groups: number;
  active_savings_circles?: number;
  contributions_paid: number;
  payouts_completed: number;
  transactions: number;
  users_by_country?: CountryStat[];
  volume_by_currency?: CurrencyVolume[];
  stellar_success_rate?: number;
  payment_provider_usage?: ProviderUsage[];
  cross_border_groups?: number;
  suspicious_activity?: number;
}

export interface AuthResponse {
  token: string;
  user: User;
}
