import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a numeric amount with a currency code (defaults to XLM). Uses string-safe parsing. */
export function formatAmount(amount: number | string, currency = "XLM") {
  const raw = typeof amount === "string" ? amount.trim() : String(amount);
  const n = Number(raw);
  const value = Number.isFinite(n) ? n : 0;
  return `${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`;
}

/** Parse a money string for API submission (avoids floating-point drift). */
export function parseMoneyInput(value: string): string {
  const trimmed = value.trim();
  if (!/^\d+(\.\d{1,2})?$/.test(trimmed)) {
    throw new Error("Enter a valid amount with up to 2 decimal places");
  }
  return trimmed;
}

/** Stellar testnet explorer link — only when a real on-chain hash exists. */
export function stellarExplorerTxUrl(hash: string) {
  return `https://stellar.expert/explorer/testnet/tx/${hash}`;
}

/** Human friendly date. */
export function formatDate(input: string | Date) {
  const d = typeof input === "string" ? new Date(input) : input;
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

/** Initials for avatars. */
export function initials(name: string) {
  return name
    .split(" ")
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join("")
    .toUpperCase();
}
