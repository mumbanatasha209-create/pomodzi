import { parsePhoneNumberFromString } from "libphonenumber-js";
import { getCountry } from "@/lib/config/countries";

export function validateEmail(email: string): string | null {
  const trimmed = email.trim();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
    return "Enter a valid email address";
  }
  return null;
}

export function validatePassword(password: string, confirm?: string): string | null {
  if (password.length < 8) return "Password must be at least 8 characters";
  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return "Password must include at least one letter and one number";
  }
  if (confirm !== undefined && password !== confirm) {
    return "Passwords do not match";
  }
  return null;
}

export function validateInternationalPhone(
  phone: string,
  countryCode: string,
): string | null {
  if (!phone.trim()) return "Phone number is required";
  const country = getCountry(countryCode);
  const region = countryCode === "GLOBAL" ? undefined : countryCode;
  const parsed = parsePhoneNumberFromString(phone, region as "ZM" | undefined);
  if (!parsed?.isValid()) {
    return "Use international format, e.g. +260 971 234 567, +254 712 345 678";
  }
  if (country && country.dialCode !== "+" && !parsed.format("E.164").startsWith(country.dialCode)) {
    return `Phone should start with ${country.dialCode} for ${country.name}`;
  }
  return null;
}
