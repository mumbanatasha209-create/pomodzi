export interface CountryConfig {
  code: string;
  name: string;
  flag: string;
  dialCode: string;
  defaultCurrency: string;
  timezone: string;
}

export const COUNTRIES: CountryConfig[] = [
  { code: "ZM", name: "Zambia", flag: "🇿🇲", dialCode: "+260", defaultCurrency: "ZMW", timezone: "Africa/Lusaka" },
  { code: "KE", name: "Kenya", flag: "🇰🇪", dialCode: "+254", defaultCurrency: "KES", timezone: "Africa/Nairobi" },
  { code: "ZA", name: "South Africa", flag: "🇿🇦", dialCode: "+27", defaultCurrency: "ZAR", timezone: "Africa/Johannesburg" },
  { code: "NG", name: "Nigeria", flag: "🇳🇬", dialCode: "+234", defaultCurrency: "NGN", timezone: "Africa/Lagos" },
  { code: "BW", name: "Botswana", flag: "🇧🇼", dialCode: "+267", defaultCurrency: "BWP", timezone: "Africa/Gaborone" },
  { code: "GH", name: "Ghana", flag: "🇬🇭", dialCode: "+233", defaultCurrency: "GHS", timezone: "Africa/Accra" },
  { code: "TZ", name: "Tanzania", flag: "🇹🇿", dialCode: "+255", defaultCurrency: "TZS", timezone: "Africa/Dar_es_Salaam" },
  { code: "UG", name: "Uganda", flag: "🇺🇬", dialCode: "+256", defaultCurrency: "UGX", timezone: "Africa/Kampala" },
  { code: "RW", name: "Rwanda", flag: "🇷🇼", dialCode: "+250", defaultCurrency: "RWF", timezone: "Africa/Kigali" },
  { code: "MW", name: "Malawi", flag: "🇲🇼", dialCode: "+265", defaultCurrency: "MWK", timezone: "Africa/Blantyre" },
  { code: "GB", name: "United Kingdom", flag: "🇬🇧", dialCode: "+44", defaultCurrency: "GBP", timezone: "Europe/London" },
  { code: "US", name: "United States", flag: "🇺🇸", dialCode: "+1", defaultCurrency: "USD", timezone: "America/New_York" },
  { code: "DE", name: "Germany", flag: "🇩🇪", dialCode: "+49", defaultCurrency: "EUR", timezone: "Europe/Berlin" },
  { code: "FR", name: "France", flag: "🇫🇷", dialCode: "+33", defaultCurrency: "EUR", timezone: "Europe/Paris" },
  { code: "GLOBAL", name: "Other / Global", flag: "🌍", dialCode: "+", defaultCurrency: "XLM", timezone: "UTC" },
];

export function getCountry(code: string) {
  return COUNTRIES.find((c) => c.code === code);
}
