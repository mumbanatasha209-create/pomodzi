export const PRIMARY_CURRENCIES = [
  "USD",
  "XLM",
  "USDC",
  "EUR",
  "GBP",
  "ZAR",
  "KES",
  "NGN",
  "ZMW",
  "BWP",
  "GHS",
  "TZS",
  "UGX",
  "RWF",
  "MWK",
] as const;

export type PrimaryCurrency = (typeof PRIMARY_CURRENCIES)[number];

export const SETTLEMENT_ASSETS = [
  { value: "XLM", label: "XLM (Stellar native)" },
  { value: "USDC", label: "USDC (Stellar testnet demo)" },
  { value: "local_currency_equivalent", label: "Local currency equivalent" },
] as const;

export function currencyBadge(code: string) {
  return code.toUpperCase();
}
