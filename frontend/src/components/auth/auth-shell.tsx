"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { BadgeCheck, Quote, ShieldCheck, TrendingUp } from "lucide-react";
import { Wordmark } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AnimatedNumber } from "@/components/ui/animated-number";

const trust = [
  { icon: ShieldCheck, label: "Non-custodial" },
  { icon: BadgeCheck, label: "Audited payouts" },
  { icon: TrendingUp, label: "Transparent growth" },
];

/** Two-pane premium auth layout: branded story panel + form. */
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="relative min-h-screen lg:grid lg:grid-cols-2">
      {/* Brand panel */}
      <div className="relative hidden overflow-hidden brand-gradient lg:flex lg:flex-col lg:justify-between lg:p-12">
        <div className="absolute inset-0 bg-grid opacity-20" />
        <div className="absolute -left-20 bottom-10 h-72 w-72 rounded-full bg-background/10 blur-3xl animate-float" />

        <div className="relative">
          <Link href="/" className="inline-flex">
            <Wordmark className="text-primary-foreground [&_span]:text-primary-foreground" />
          </Link>
        </div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="relative max-w-md text-primary-foreground"
        >
          <Quote className="h-8 w-8 opacity-60" />
          <p className="mt-4 text-2xl font-semibold leading-snug">
            “Pamodzi turned our monthly chama into something we can finally see
            and trust — every contribution, every payout, on-chain.”
          </p>
          <p className="mt-4 text-sm text-primary-foreground/80">
            Amara N. — Stokvel organizer, Lusaka
          </p>

          <div className="mt-10 grid grid-cols-3 gap-4">
            <Stat value={18400} suffix="+" label="Members" />
            <Stat value={1280} suffix="+" label="Circles" />
            <Stat value={99.9} decimals={1} suffix="%" label="Payouts" />
          </div>
        </motion.div>

        <div className="relative flex items-center gap-4 text-sm text-primary-foreground/85">
          {trust.map((t) => {
            const Icon = t.icon;
            return (
              <span key={t.label} className="inline-flex items-center gap-1.5">
                <Icon className="h-4 w-4" /> {t.label}
              </span>
            );
          })}
        </div>
      </div>

      {/* Form panel */}
      <div className="relative flex min-h-screen flex-col bg-background">
        <div className="pointer-events-none absolute inset-0 -z-0 bg-radial-fade" />
        <div className="flex items-center justify-between px-5 py-5 lg:justify-end">
          <Link href="/" className="lg:hidden">
            <Wordmark />
          </Link>
          <ThemeToggle />
        </div>
        <div className="relative flex flex-1 items-center justify-center px-5 pb-12">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full max-w-sm"
          >
            {children}
          </motion.div>
        </div>
      </div>
    </div>
  );
}

function Stat({
  value,
  label,
  suffix,
  decimals = 0,
}: {
  value: number;
  label: string;
  suffix?: string;
  decimals?: number;
}) {
  return (
    <div>
      <p className="tabular text-2xl font-bold">
        <AnimatedNumber value={value} suffix={suffix} decimals={decimals} />
      </p>
      <p className="text-xs text-primary-foreground/75">{label}</p>
    </div>
  );
}
