import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

/** Merge Tailwind class names, resolving conflicts. */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Format a numeric amount with a currency code (defaults to XLM). */
export function formatAmount(amount: number | string, currency = "XLM") {
  const n = typeof amount === "string" ? parseFloat(amount) : amount;
  const value = Number.isFinite(n) ? n : 0;
  return `${value.toLocaleString(undefined, { maximumFractionDigits: 4 })} ${currency}`;
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
