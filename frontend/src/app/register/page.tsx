"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, Loader2 } from "lucide-react";
import { useAuth } from "@/context/auth-context";
import { ApiError } from "@/lib/api";
import { COUNTRIES } from "@/lib/config/countries";
import {
  validateEmail,
  validateInternationalPhone,
  validatePassword,
} from "@/lib/validation";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AuthShell } from "@/components/auth/auth-shell";

export default function RegisterPage() {
  const { register } = useAuth();
  const [form, setForm] = useState({
    full_name: "",
    email: "",
    country: "ZM",
    phone: "",
    password: "",
    confirm_password: "",
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const selectedCountry = useMemo(
    () => COUNTRIES.find((c) => c.code === form.country),
    [form.country],
  );

  function update(key: keyof typeof form) {
    return (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) =>
      setForm((f) => ({ ...f, [key]: e.target.value }));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    const emailErr = validateEmail(form.email);
    if (emailErr) return setError(emailErr);
    const passErr = validatePassword(form.password, form.confirm_password);
    if (passErr) return setError(passErr);
    const phoneErr = validateInternationalPhone(form.phone, form.country);
    if (phoneErr) return setError(phoneErr);

    setLoading(true);
    try {
      await register({
        full_name: form.full_name,
        email: form.email,
        password: form.password,
        confirm_password: form.confirm_password,
        phone: form.phone,
        phone_country_code: form.country,
        country: form.country,
      });
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Unable to register");
      setLoading(false);
    }
  }

  return (
    <AuthShell>
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Create your account</h1>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Join Pamodzi from anywhere — your Stellar digital wallet is created
          automatically on testnet.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1.5">
          <Label htmlFor="full_name">Full name</Label>
          <Input
            id="full_name"
            placeholder="Amara Nakamura"
            value={form.full_name}
            onChange={update("full_name")}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            placeholder="you@example.com"
            value={form.email}
            onChange={update("email")}
            required
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="country">Country</Label>
          <select
            id="country"
            value={form.country}
            onChange={update("country")}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            required
          >
            {COUNTRIES.map((c) => (
              <option key={c.code} value={c.code}>
                {c.flag} {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone number</Label>
          <Input
            id="phone"
            type="tel"
            placeholder={
              form.country === "KE"
                ? "+254 712 345 678"
                : form.country === "ZA"
                  ? "+27 82 123 4567"
                  : form.country === "GB"
                    ? "+44 7700 900123"
                    : "+260 971 234 567"
            }
            value={form.phone}
            onChange={update("phone")}
            required
          />
          <p className="text-xs text-muted-foreground">
            International format with country code
            {selectedCountry ? ` (${selectedCountry.dialCode})` : ""}
          </p>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password">Password</Label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            placeholder="At least 8 characters"
            value={form.password}
            onChange={update("password")}
            required
            minLength={8}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="confirm_password">Confirm password</Label>
          <Input
            id="confirm_password"
            type="password"
            autoComplete="new-password"
            value={form.confirm_password}
            onChange={update("confirm_password")}
            required
            minLength={8}
          />
        </div>

        {error ? (
          <motion.p
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive"
          >
            {error}
          </motion.p>
        ) : null}

        <Button type="submit" size="lg" className="w-full" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Creating account…
            </>
          ) : (
            <>
              Create account <ArrowRight className="h-4 w-4" />
            </>
          )}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-muted-foreground">
        Already have an account?{" "}
        <Link href="/login" className="font-medium text-primary hover:underline">
          Log in
        </Link>
      </p>
    </AuthShell>
  );
}
