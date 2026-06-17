"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  Coins,
  Globe2,
  Layers,
  LineChart,
  Lock,
  PiggyBank,
  Repeat,
  ShieldCheck,
  Sparkles,
  Users,
  Wallet,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Wordmark } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Sparkline, makeSeries } from "@/components/ui/charts";
import { Reveal, Stagger, staggerItem } from "@/components/shared/reveal";

const features = [
  {
    icon: Users,
    title: "Savings circles",
    desc: "Create savings circles, chamas, stokvels, cooperatives, and community groups with shared goals.",
  },
  {
    icon: Wallet,
    title: "Digital wallets",
    desc: "Every member gets a Stellar digital wallet to fund, contribute, and receive payouts across borders.",
  },
  {
    icon: Repeat,
    title: "Stellar-powered payouts",
    desc: "Automate rotating payouts on Stellar testnet with transparent settlement and near-instant finality.",
  },
  {
    icon: Globe2,
    title: "Cross-border contributions",
    desc: "Members in different countries can contribute to the same circle with clear treasury records.",
  },
  {
    icon: Coins,
    title: "Multi-currency readiness",
    desc: "Set primary currency per circle — USD, XLM, USDC, EUR, ZAR, KES, NGN, ZMW, and more.",
  },
  {
    icon: LineChart,
    title: "Transparent group records",
    desc: "Track contributions, treasury activity, and payout history with immutable on-chain references.",
  },
  {
    icon: ShieldCheck,
    title: "Trust and audit logs",
    desc: "Platform audit logs and transaction history keep every group accountable and review-ready.",
  },
];

const stats = [
  { label: "Pooled on-chain", value: 2.4, suffix: "M XLM", decimals: 1 },
  { label: "Active circles", value: 1280, suffix: "+" },
  { label: "Members saving", value: 18400, suffix: "+" },
  { label: "Payout success", value: 99.9, suffix: "%", decimals: 1 },
];

const steps = [
  { icon: Users, title: "Create or join", desc: "Start a circle or join with an invite code in seconds." },
  { icon: Coins, title: "Contribute", desc: "Fund the cycle from your wallet. Everyone pays in." },
  { icon: PiggyBank, title: "Get paid", desc: "Payouts rotate automatically to each member, in turn." },
];

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background">
      {/* Ambient backdrop */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute inset-0 bg-grid opacity-[0.35] mask-fade-b" />
        <div className="absolute left-1/2 top-[-12%] h-[520px] w-[820px] -translate-x-1/2 rounded-full bg-[radial-gradient(closest-side,hsl(var(--brand-2)/0.28),transparent)] blur-2xl" />
        <div className="absolute right-[-10%] top-[20%] h-[360px] w-[360px] rounded-full bg-[radial-gradient(closest-side,hsl(var(--brand-violet)/0.22),transparent)] blur-2xl animate-float" />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/60 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3.5 sm:px-6">
          <Wordmark />
          <div className="flex items-center gap-2">
            <ThemeToggle />
            <Link href="/login" className="hidden sm:block">
              <Button variant="ghost" size="sm">
                Log in
              </Button>
            </Link>
            <Link href="/register">
              <Button size="sm">
                Get started <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="mx-auto max-w-6xl px-4 pb-16 pt-14 sm:px-6 sm:pt-20">
        <div className="mx-auto max-w-3xl text-center">
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-secondary/40 px-3 py-1.5 text-xs font-medium text-muted-foreground backdrop-blur"
          >
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            Powered by Stellar
            <span className="h-1 w-1 rounded-full bg-border" />
            Community wealth, on-chain
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.05 }}
            className="text-balance text-4xl font-bold tracking-tight sm:text-6xl"
          >
            Save together.
            <br />
            <span className="text-gradient">Grow across borders.</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.12 }}
            className="mx-auto mt-5 max-w-2xl text-pretty text-base text-muted-foreground sm:text-lg"
          >
            Pamodzi Finance helps communities create savings circles, track contributions,
            manage group treasuries, and automate rotating payouts using Stellar.
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.18 }}
            className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row"
          >
            <Link href="/register" className="w-full sm:w-auto">
              <Button size="lg" className="w-full sm:w-auto">
                Create your circle <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
            <Link href="/login" className="w-full sm:w-auto">
              <Button size="lg" variant="glass" className="w-full sm:w-auto">
                I have an account
              </Button>
            </Link>
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6, delay: 0.28 }}
            className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground"
          >
            <span className="inline-flex items-center gap-1.5">
              <Lock className="h-3.5 w-3.5 text-primary" /> Non-custodial wallets
            </span>
            <span className="inline-flex items-center gap-1.5">
              <BadgeCheck className="h-3.5 w-3.5 text-primary" /> Audited payouts
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Globe2 className="h-3.5 w-3.5 text-primary" /> Borderless &amp; low-fee
            </span>
          </motion.div>
        </div>

        {/* Hero dashboard preview */}
        <motion.div
          initial={{ opacity: 0, y: 40, scale: 0.97 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.25, ease: [0.22, 1, 0.36, 1] }}
          className="relative mx-auto mt-14 max-w-4xl"
        >
          <div className="absolute -inset-4 -z-10 rounded-[2rem] brand-gradient opacity-20 blur-2xl" />
          <Card className="overflow-hidden p-0 shadow-card-lg" glass>
            <div className="flex items-center gap-1.5 border-b border-border/60 px-4 py-3">
              <span className="h-3 w-3 rounded-full bg-destructive/60" />
              <span className="h-3 w-3 rounded-full bg-[hsl(var(--warning)/0.6)]" />
              <span className="h-3 w-3 rounded-full bg-[hsl(var(--success)/0.6)]" />
              <span className="ml-3 text-xs text-muted-foreground">
                app.pamodzi.finance / overview
              </span>
            </div>
            <div className="grid gap-4 p-4 sm:grid-cols-3 sm:p-6">
              <div className="sm:col-span-2">
                <div className="rounded-2xl brand-gradient p-5 text-primary-foreground">
                  <p className="text-sm text-primary-foreground/80">
                    Total group balance
                  </p>
                  <p className="tabular mt-1 text-3xl font-bold">
                    <AnimatedNumber value={48250} suffix=" XLM" />
                  </p>
                  <div className="mt-4 h-16 opacity-90">
                    <Sparkline
                      data={makeSeries(7, 16, 100, 0.5)}
                      color="hsl(var(--primary-foreground))"
                      height={64}
                    />
                  </div>
                </div>
              </div>
              <div className="grid gap-4">
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground">This cycle</p>
                  <p className="tabular mt-1 text-xl font-bold">
                    <AnimatedNumber value={8} />/10 paid
                  </p>
                  <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-muted">
                    <motion.div
                      initial={{ width: 0 }}
                      animate={{ width: "80%" }}
                      transition={{ duration: 1.2, delay: 0.6 }}
                      className="h-full brand-gradient"
                    />
                  </div>
                </Card>
                <Card className="p-4">
                  <p className="text-xs text-muted-foreground">Next payout</p>
                  <p className="tabular mt-1 text-xl font-bold">
                    <AnimatedNumber value={4825} suffix=" XLM" />
                  </p>
                  <p className="mt-1 text-xs text-[hsl(var(--success))]">
                    Auto-rotating
                  </p>
                </Card>
              </div>
            </div>
          </Card>
        </motion.div>
      </section>

      {/* Stats */}
      <section className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
        <Stagger
          scroll
          className="grid grid-cols-2 gap-4 sm:grid-cols-4"
        >
          {stats.map((s) => (
            <motion.div key={s.label} variants={staggerItem}>
              <Card className="p-5 text-center sm:text-left" hover>
                <p className="tabular text-2xl font-bold tracking-tight sm:text-3xl">
                  <AnimatedNumber
                    value={s.value}
                    decimals={s.decimals ?? 0}
                    suffix={s.suffix}
                  />
                </p>
                <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
              </Card>
            </motion.div>
          ))}
        </Stagger>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Reveal className="mx-auto max-w-2xl text-center">
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            Everything a modern circle needs
          </h2>
          <p className="mt-3 text-muted-foreground">
            The trust of community saving, with the speed and transparency of
            blockchain.
          </p>
        </Reveal>

        <Stagger scroll className="mt-12 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f) => {
            const Icon = f.icon;
            return (
              <motion.div key={f.title} variants={staggerItem}>
                <Card hover className="h-full p-6">
                  <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-secondary/50 text-primary">
                    <Icon className="h-5 w-5" />
                  </div>
                  <h3 className="mt-4 font-semibold">{f.title}</h3>
                  <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">
                    {f.desc}
                  </p>
                </Card>
              </motion.div>
            );
          })}
        </Stagger>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <Reveal>
          <Card className="overflow-hidden p-8 sm:p-12" glass>
            <div className="mx-auto max-w-2xl text-center">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-[hsl(var(--brand-violet)/0.14)] px-3 py-1 text-xs font-medium text-[hsl(var(--brand-violet))]">
                <Layers className="h-3.5 w-3.5" /> How it works
              </span>
              <h2 className="mt-4 text-3xl font-bold tracking-tight">
                Save together in three steps
              </h2>
            </div>
            <div className="mt-10 grid gap-6 sm:grid-cols-3">
              {steps.map((s, i) => {
                const Icon = s.icon;
                return (
                  <div key={s.title} className="relative text-center">
                    <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl brand-gradient text-primary-foreground shadow-glow">
                      <Icon className="h-6 w-6" />
                    </div>
                    <p className="mt-2 text-xs font-medium text-primary">
                      Step {i + 1}
                    </p>
                    <h3 className="mt-1 font-semibold">{s.title}</h3>
                    <p className="mt-1 text-sm text-muted-foreground">{s.desc}</p>
                  </div>
                );
              })}
            </div>
          </Card>
        </Reveal>
      </section>

      {/* CTA */}
      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <Reveal>
          <div className="relative overflow-hidden rounded-3xl brand-gradient p-10 text-center text-primary-foreground sm:p-16">
            <div className="absolute inset-0 bg-grid opacity-20" />
            <div className="relative">
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                Start saving together today
              </h2>
              <p className="mx-auto mt-3 max-w-md text-primary-foreground/85">
                Join thousands building community wealth on Pamodzi. Free to
                start, transparent by design.
              </p>
              <Link href="/register" className="mt-7 inline-block">
                <Button
                  size="lg"
                  variant="glass"
                  className="bg-background/15 text-primary-foreground hover:bg-background/25"
                >
                  Create your free account <ArrowRight className="h-4 w-4" />
                </Button>
              </Link>
            </div>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-border/60">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6">
          <Wordmark />
          <p>© {new Date().getFullYear()} Pamodzi Finance. Built for communities saving together across borders.</p>
          <span className="inline-flex items-center gap-1.5">
            <span className="live-dot relative flex h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
            Stellar testnet
          </span>
        </div>
      </footer>
    </div>
  );
}
