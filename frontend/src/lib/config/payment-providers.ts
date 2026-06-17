export interface PaymentProvider {
  id: string;
  label: string;
  type: "stellar" | "mobile_money" | "bank" | "card" | "agent" | "demo";
  countries: string[] | "global";
}

export const PAYMENT_PROVIDERS: PaymentProvider[] = [
  { id: "stellar_wallet", label: "Stellar Wallet", type: "stellar", countries: "global" },
  { id: "usdc", label: "USDC", type: "stellar", countries: "global" },
  { id: "bank_transfer_demo", label: "Bank Transfer Demo", type: "bank", countries: "global" },
  { id: "card_demo", label: "Card Demo", type: "card", countries: "global" },
  { id: "agent_deposit_demo", label: "Agent Deposit Demo", type: "agent", countries: "global" },
  { id: "airtel_money_zm", label: "Airtel Money", type: "mobile_money", countries: ["ZM"] },
  { id: "mtn_momo_zm", label: "MTN MoMo", type: "mobile_money", countries: ["ZM"] },
  { id: "zamtel_kwacha", label: "Zamtel Kwacha", type: "mobile_money", countries: ["ZM"] },
  { id: "mpesa_ke", label: "M-Pesa", type: "mobile_money", countries: ["KE"] },
  { id: "airtel_money_ke", label: "Airtel Money", type: "mobile_money", countries: ["KE"] },
  { id: "bank_eft_za", label: "Bank EFT", type: "bank", countries: ["ZA"] },
  { id: "mobile_wallet_za", label: "Mobile Wallet", type: "mobile_money", countries: ["ZA"] },
  { id: "bank_transfer_ng", label: "Bank Transfer", type: "bank", countries: ["NG"] },
  { id: "mobile_money_ng", label: "Mobile Money", type: "mobile_money", countries: ["NG"] },
  { id: "card_ng", label: "Card", type: "card", countries: ["NG"] },
  { id: "mobile_money_demo", label: "Mobile Money Demo", type: "demo", countries: "global" },
];

export function providersForCountry(countryCode: string): PaymentProvider[] {
  const code = countryCode.toUpperCase();
  return PAYMENT_PROVIDERS.filter(
    (p) =>
      p.countries === "global" ||
      (Array.isArray(p.countries) && p.countries.includes(code)),
  );
}
