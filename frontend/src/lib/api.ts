import type {
  AdminStats,
  AuditLog,
  AuthResponse,
  ContributeResponse,
  Contribution,
  GroupDetailResponse,
  GroupListItem,
  GroupMember,
  Notification,
  Payout,
  SavingsGroup,
  Transaction,
  User,
  Wallet,
} from "./types";

export const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

const TOKEN_KEY = "pamodzi_token";

export function getToken(): string | null {
  if (typeof window === "undefined") return null;
  return window.localStorage.getItem(TOKEN_KEY);
}

export function setToken(token: string) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(TOKEN_KEY, token);
}

export function clearToken() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
    this.name = "ApiError";
  }
}

interface RequestOptions extends Omit<RequestInit, "body"> {
  body?: unknown;
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const { body, headers, ...rest } = options;
  const token = getToken();

  const res = await fetch(`${API_URL}${path}`, {
    ...rest,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...headers,
    },
    body: body !== undefined ? JSON.stringify(body) : undefined,
    cache: "no-store",
  });

  if (!res.ok) {
    let message = res.statusText;
    try {
      const data = await res.json();
      message = data?.error || data?.message || message;
    } catch {
      /* ignore non-json error bodies */
    }
    if (res.status === 401) clearToken();
    throw new ApiError(message, res.status);
  }

  if (res.status === 204) return undefined as T;
  const text = await res.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

export const api = {
  // ---- Auth ----
  register: (input: {
    full_name: string;
    email: string;
    password: string;
    confirm_password?: string;
    phone?: string;
    phone_country_code?: string;
    country?: string;
  }) => request<AuthResponse>("/api/auth/register", { method: "POST", body: input }),

  login: (input: { email: string; password: string }) =>
    request<AuthResponse>("/api/auth/login", { method: "POST", body: input }),

  me: () => request<User>("/api/auth/me"),

  // ---- Wallet ----
  wallet: () => request<Wallet>("/api/wallet"),

  // ---- Groups ----
  listGroups: async () => {
    const rows = await request<GroupListItem[]>("/api/groups");
    return rows.map((r) => ({ ...r.group, member_count: r.member_count }));
  },
  getGroup: (id: string) => request<GroupDetailResponse>(`/api/groups/${id}`),
  createGroup: (input: {
    name: string;
    description?: string;
    contribution_amount: string;
    currency?: string;
    primary_country?: string;
    settlement_asset?: string;
    timezone?: string;
    frequency: "weekly" | "monthly";
  }) => request<SavingsGroup>("/api/groups", { method: "POST", body: input }),
  joinGroup: (input: { invite_code: string }) =>
    request<SavingsGroup>("/api/groups/join", { method: "POST", body: input }),
  addMember: (id: string, input: { email: string }) =>
    request<GroupMember>(`/api/groups/${id}/members`, { method: "POST", body: input }),
  contribute: (id: string, input: { amount: string; payment_provider?: string }) =>
    request<ContributeResponse>(`/api/groups/${id}/contribute`, { method: "POST", body: input }),
  updateRotation: (
    id: string,
    input: { order: { user_id: string; rotation_order: number }[] },
  ) =>
    request<GroupMember[]>(`/api/groups/${id}/rotation`, { method: "PUT", body: input }),
  groupContributions: (id: string) =>
    request<Contribution[]>(`/api/groups/${id}/contributions`),
  groupPayouts: (id: string) => request<Payout[]>(`/api/groups/${id}/payouts`),

  // ---- Transactions ----
  transactions: () => request<Transaction[]>("/api/transactions"),

  // ---- Notifications ----
  notifications: () => request<Notification[]>("/api/notifications"),
  readNotification: (id: string) =>
    request<Notification>(`/api/notifications/${id}/read`, { method: "PUT" }),

  // ---- Admin ----
  adminStats: () => request<AdminStats>("/api/admin/stats"),
  adminUsers: () => request<User[]>("/api/admin/users"),
  adminGroups: () => request<SavingsGroup[]>("/api/admin/groups"),
  adminAuditLogs: () => request<AuditLog[]>("/api/admin/audit-logs"),
};
