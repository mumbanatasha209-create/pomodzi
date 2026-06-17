import type { TxType } from "@/lib/types";

const LABELS: Record<TxType, string> = {
  wallet_funding: "Wallet Funding",
  contribution: "Group Contribution",
  payout: "Rotating Payout",
  transfer: "Settlement Transfer",
  treasury_deposit: "Treasury Deposit",
  cross_border_contribution: "Cross-Border Contribution",
  settlement_transfer: "Settlement Transfer",
};

export function transactionLabel(txType: string): string {
  if (txType in LABELS) return LABELS[txType as TxType];
  switch (txType) {
    case "treasury_deposit":
      return "Treasury Deposit";
    case "cross_border_contribution":
      return "Cross-Border Contribution";
    case "settlement_transfer":
      return "Settlement Transfer";
    default:
      return txType.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  }
}
