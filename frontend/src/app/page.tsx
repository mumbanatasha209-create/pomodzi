"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BadgeCheck,
  CircleDollarSign,
  FileSearch,
  Globe2,
  KeyRound,
  Layers,
  LineChart,
  Lock,
  Repeat,
  ShieldCheck,
  Sparkles,
  Users,
  Vault,
  Wallet,
} from "lucide-react";
import { Wordmark } from "@/components/shared/logo";
import { ThemeToggle } from "@/components/theme/theme-toggle";
import {
  AnimatedCounter,
  FeatureCard,
  FloatingDashboardPreview,
  GlowBackground,
  GlobalNetwork,
  MoneyFlowAnimation,
  PremiumButton,
  TrustBadge,
} from "@/components/landing";

const features = [
  {
    icon: Users,
    title: "Savings circles",
    description:
      "Launch rotating savings circles for families, diaspora groups, cooperatives, and community funds — anywhere in the world.",
  },
  {
    icon: Vault,
    title: "Group treasury",
    description:
      "Every circle gets a dedicated on-chain treasury. Contributions pool transparently with real-time balance tracking.",
  },
  {
    icon: Repeat,
    title: "Automated payouts",
    description:
      "When the cycle completes, payouts rotate automatically to the next beneficiary — no manual reconciliation.",
  },
  {
    icon: Wallet,
    title: "Stellar wallets",
    description:
      "Each member receives a non-custodial Stellar wallet. Encrypted secrets, instant settlement, near-zero fees.",
  },
  {
    icon: Globe2,
    title: "Cross-border contributions",
    description:
      "Members in Zambia, Kenya, Nigeria, the UK, or the US can contribute to the same circle in XLM or USDC.",
  },
  {
    icon: LineChart,
    title: "Audit trail",
    description:
      "Every contribution and payout links to a real Stellar transaction hash. Full history, zero fake records.",
  },
];

const trustItems = [
  {
    icon: Layers,
    title: "Testnet first",
    description:
      "Built and verified on Stellar Testnet. Real on-chain transactions before any mainnet deployment.",
  },
  {
    icon: FileSearch,
    title: "Transparent records",
    description:
      "Contribution history, treasury activity, and payout logs are visible to every circle member.",
  },
  {
    icon: BadgeCheck,
    title: "No fake hashes",
    description:
      "Blockchain hashes are only stored after Horizon confirms success. No simulated transactions.",
  },
  {
    icon: CircleDollarSign,
    title: "Audited payouts",
    description:
      "Rotating payouts execute on-chain with verifiable transaction references on Stellar Expert.",
  },
  {
    icon: ShieldCheck,
    title: "Role-based access",
    description:
      "Admins, circle creators, and members each have scoped permissions. Platform audit logs included.",
  },
  {
    icon: KeyRound,
    title: "Encrypted wallet secrets",
    description:
      "Private keys are encrypted at rest. Pamodzi never holds custody of member funds.",
  },
];

const stats = [
  { label: "Settlement time", value: 5, suffix: "s", decimals: 0 },
  { label: "Transaction fee", value: 0.00001, suffix: " XLM", decimals: 5 },
  { label: "Countries supported", value: 50, suffix: "+" },
  { label: "On-chain transparency", value: 100, suffix: "%" },
];

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <motion.span
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true }}
      className="landing-accent-chip inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium"
    >
      <Sparkles className="h-3.5 w-3.5" />
      {children}
    </motion.span>
  );
}

function SectionHeading({
  title,
  subtitle,
  align = "center",
}: {
  title: string;
  subtitle: string;
  align?: "left" | "center";
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.5 }}
      transition={{ duration: 0.6 }}
      className={align === "center" ? "mx-auto max-w-2xl text-center" : "max-w-2xl"}
    >
      <h2 className="text-balance text-3xl font-bold tracking-tight text-foreground sm:text-4xl lg:text-5xl">
        {title}
      </h2>
      <p className="mt-4 text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg">
        {subtitle}
      </p>
    </motion.div>
  );
}

export default function LandingPage() {
  return (
    <div className="landing-shell relative min-h-screen overflow-x-hidden">
      <GlowBackground />

      {/* ── Navigation ─────────────────────────────────────────────── */}
      <header className="landing-header sticky top-0 z-50 border-b backdrop-blur-2xl">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
          <Wordmark />
          <nav className="hidden items-center gap-8 text-sm text-muted-foreground md:flex">
            <a href="#flow" className="transition-colors hover:text-foreground">
              How it works
            </a>
            <a href="#features" className="transition-colors hover:text-foreground">
              Features
            </a>
            <a href="#global" className="transition-colors hover:text-foreground">
              Global
            </a>
            <a href="#trust" className="transition-colors hover:text-foreground">
              Trust
            </a>
          </nav>
          <div className="flex items-center gap-2 sm:gap-3">
            <ThemeToggle />
            <Link
              href="/login"
              className="hidden text-sm font-medium text-muted-foreground transition-colors hover:text-foreground sm:block"
            >
              Log in
            </Link>
            <PremiumButton href="/register" size="default">
              Get started <ArrowRight className="h-4 w-4" />
            </PremiumButton>
          </div>
        </div>
      </header>

      {/* ── 1. Hero ────────────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-4 pb-20 pt-12 sm:px-6 sm:pt-16 lg:px-8 lg:pb-28 lg:pt-20">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          {/* Left — copy */}
          <div className="relative z-10">
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="landing-glass mb-6 inline-flex items-center gap-2 rounded-full px-3.5 py-1.5 text-xs font-medium text-muted-foreground"
            >
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-60" />
                <span className="relative inline-flex h-2 w-2 rounded-full bg-primary" />
              </span>
              Powered by Stellar Testnet
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 24 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.7, delay: 0.08 }}
              className="text-balance text-4xl font-bold leading-[1.08] tracking-tight text-foreground sm:text-5xl lg:text-6xl xl:text-[4.25rem]"
            >
              Community wealth,
              <br />
              <span className="text-gradient">moving on Stellar.</span>
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.16 }}
              className="mt-6 max-w-lg text-pretty text-base leading-relaxed text-muted-foreground sm:text-lg"
            >
              Create global savings circles, track contributions, and automate
              rotating payouts across borders.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.24 }}
              className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center"
            >
              <PremiumButton href="/register" variant="primary" size="lg">
                Create your circle <ArrowRight className="h-4 w-4" />
              </PremiumButton>
              <PremiumButton href="/login" variant="glass" size="lg">
                I have an account
              </PremiumButton>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.6, delay: 0.36 }}
              className="mt-8 flex flex-wrap gap-x-5 gap-y-2 text-xs text-muted-foreground"
            >
              <span className="inline-flex items-center gap-1.5">
                <Lock className="h-3.5 w-3.5 text-primary" /> Non-custodial
              </span>
              <span className="inline-flex items-center gap-1.5">
                <BadgeCheck className="h-3.5 w-3.5 text-primary" /> Real on-chain txs
              </span>
              <span className="inline-flex items-center gap-1.5">
                <Globe2 className="h-3.5 w-3.5 text-primary" /> Cross-border
              </span>
            </motion.div>
          </div>

          {/* Right — animated preview */}
          <div className="relative z-10 lg:pl-4">
            <FloatingDashboardPreview />
          </div>
        </div>
      </section>

      {/* ── Stats strip ────────────────────────────────────────────── */}
      <section className="relative border-y border-border/40 bg-card/30 backdrop-blur-sm">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-px bg-border/30 px-4 sm:px-6 lg:grid-cols-4 lg:px-8">
          {stats.map((s, i) => (
            <motion.div
              key={s.label}
              initial={{ opacity: 0, y: 16 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: i * 0.08 }}
              className="landing-stat-cell px-6 py-8 text-center sm:text-left"
            >
              <p className="tabular text-2xl font-bold text-foreground sm:text-3xl">
                <AnimatedCounter
                  value={s.value}
                  decimals={s.decimals ?? 0}
                  suffix={s.suffix}
                />
              </p>
              <p className="mt-1 text-sm text-muted-foreground">{s.label}</p>
            </motion.div>
          ))}
        </div>
      </section>

      {/* ── 2. Live product preview ────────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mb-12 flex flex-col items-start gap-4 sm:items-center sm:text-center">
          <SectionLabel>Live product preview</SectionLabel>
          <SectionHeading
            title="See your circle in motion"
            subtitle="Contributions flow in, the treasury grows, and payouts release automatically — all visible in a single glass dashboard."
          />
        </div>

        <motion.div
          initial={{ opacity: 0, y: 40 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ duration: 0.8 }}
          className="relative mx-auto max-w-5xl"
        >
          <div className="absolute -inset-8 rounded-[2.5rem] bg-gradient-to-br from-primary/15 via-transparent to-accent/10 blur-3xl landing-glow-pulse" />
          <div className="landing-glass-strong relative overflow-hidden rounded-3xl">
            <div className="grid gap-0 lg:grid-cols-5">
              {/* Left panel — activity feed */}
              <div className="border-b border-border/50 p-6 lg:col-span-2 lg:border-b-0 lg:border-r dark:border-white/10">
                <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Circle activity
                </p>
                <p className="mt-1 text-lg font-semibold text-foreground">Global Family Fund</p>
                <div className="mt-6 space-y-3">
                  {[
                    { who: "Carol", action: "contributed 5 XLM", time: "2m ago", done: true },
                    { who: "Bob", action: "contributed 5 XLM", time: "5m ago", done: true },
                    { who: "Alice", action: "contributed 5 XLM", time: "8m ago", done: true },
                    { who: "Treasury", action: "payout → Alice 15 XLM", time: "Just now", done: true },
                  ].map((item, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true }}
                      transition={{ delay: 0.3 + i * 0.1 }}
                      className="flex items-center gap-3 rounded-xl border border-border/40 bg-secondary/30 px-3 py-2.5 dark:border-white/5 dark:bg-white/[0.03]"
                    >
                      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary/20 to-accent/10 text-xs font-bold text-primary dark:text-cyan-300">
                        {item.who[0]}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm text-foreground">
                          <span className="font-medium">{item.who}</span>{" "}
                          <span className="text-muted-foreground">{item.action}</span>
                        </p>
                        <p className="text-[10px] text-muted-foreground">{item.time}</p>
                      </div>
                      {item.done && (
                        <BadgeCheck className="h-4 w-4 shrink-0 text-[hsl(var(--success))]" />
                      )}
                    </motion.div>
                  ))}
                </div>
              </div>

              {/* Right panel — metrics */}
              <div className="p-6 lg:col-span-3">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/50 bg-gradient-to-br from-primary/10 to-transparent p-5 dark:border-white/10">
                    <p className="text-xs text-muted-foreground">Treasury Balance</p>
                    <p className="tabular mt-1 text-3xl font-bold text-foreground">
                      <AnimatedCounter value={15000} suffix=" XLM" />
                    </p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-secondary/30 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-xs text-muted-foreground">Contribution Progress</p>
                    <p className="tabular mt-1 text-3xl font-bold text-foreground">
                      <AnimatedCounter value={3} suffix="/5" />
                    </p>
                    <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-border/60 dark:bg-white/10">
                      <motion.div
                        className="h-full brand-gradient"
                        initial={{ width: 0 }}
                        whileInView={{ width: "60%" }}
                        viewport={{ once: true }}
                        transition={{ duration: 1.2, delay: 0.4 }}
                      />
                    </div>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-secondary/30 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-xs text-muted-foreground">Next Payout Recipient</p>
                    <p className="mt-1 text-xl font-semibold text-foreground">Alice</p>
                    <p className="mt-0.5 text-sm text-[hsl(var(--success))]">15,000 XLM rotating</p>
                  </div>
                  <div className="rounded-2xl border border-border/50 bg-secondary/30 p-5 dark:border-white/10 dark:bg-white/[0.03]">
                    <p className="text-xs text-muted-foreground">Stellar Network</p>
                    <p className="mt-1 inline-flex items-center gap-2 text-xl font-semibold text-foreground">
                      <span className="h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
                      Online
                    </p>
                    <p className="mt-0.5 font-mono text-[11px] text-primary/80 dark:text-cyan-300/70">
                      0b96e7…9b9ffeb
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  {["XLM", "USDC", "Testnet", "Real hashes"].map((chip) => (
                    <span
                      key={chip}
                      className="landing-glass rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground"
                    >
                      {chip}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      </section>

      {/* ── 3. How the money flows ─────────────────────────────────── */}
      <section id="flow" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mb-14 flex flex-col items-start gap-4 sm:items-center sm:text-center">
          <SectionLabel>How the money flows</SectionLabel>
          <SectionHeading
            title="From members to payout, on-chain"
            subtitle="Every XLM contribution follows a transparent path through your group treasury, settles on Stellar Testnet, and releases to the next beneficiary."
          />
        </div>
        <MoneyFlowAnimation />
      </section>

      {/* ── 4. Features ────────────────────────────────────────────── */}
      <section id="features" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mb-14 flex flex-col items-start gap-4 sm:items-center sm:text-center">
          <SectionLabel>Platform features</SectionLabel>
          <SectionHeading
            title="Built for global community finance"
            subtitle="The trust of traditional savings circles, powered by Stellar's speed, transparency, and near-zero fees."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {features.map((f, i) => (
            <FeatureCard
              key={f.title}
              icon={f.icon}
              title={f.title}
              description={f.description}
              index={i}
            />
          ))}
        </div>
      </section>

      {/* ── 5. Global savings circles ──────────────────────────────── */}
      <section id="global" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="grid items-center gap-12 lg:grid-cols-2 lg:gap-16">
          <div>
            <SectionLabel>Global savings circles</SectionLabel>
            <SectionHeading
              align="left"
              title="One circle, members everywhere"
              subtitle="Pamodzi connects savers across continents. A member in Lusaka, Nairobi, Lagos, London, or New York can contribute to the same rotating fund."
            />
            <motion.ul
              initial={{ opacity: 0 }}
              whileInView={{ opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: 0.3 }}
              className="mt-8 space-y-3"
            >
              {[
                "Multi-currency treasuries — XLM, USDC, and more",
                "Near-instant cross-border settlement",
                "Country-aware registration and phone validation",
                "Transparent records for every member",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-muted-foreground">
                  <BadgeCheck className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                  {item}
                </li>
              ))}
            </motion.ul>
          </div>
          <GlobalNetwork />
        </div>
      </section>

      {/* ── 6. Trust and transparency ──────────────────────────────── */}
      <section id="trust" className="relative mx-auto max-w-7xl px-4 py-24 sm:px-6 lg:px-8">
        <div className="mb-14 flex flex-col items-start gap-4 sm:items-center sm:text-center">
          <SectionLabel>Trust &amp; transparency</SectionLabel>
          <SectionHeading
            title="Finance you can verify"
            subtitle="No simulated transactions. No fake hashes. Every payment is confirmed on Stellar before it appears in your records."
          />
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {trustItems.map((t, i) => (
            <TrustBadge
              key={t.title}
              icon={t.icon}
              title={t.title}
              description={t.description}
              delay={i * 0.08}
            />
          ))}
        </div>
      </section>

      {/* ── 7. Final CTA ───────────────────────────────────────────── */}
      <section className="relative mx-auto max-w-7xl px-4 pb-24 pt-8 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.7 }}
          className="relative overflow-hidden rounded-3xl border border-white/10"
        >
          <div className="absolute inset-0 brand-gradient opacity-90" />
          <div className="absolute inset-0 bg-grid opacity-15" />
          <motion.div
            className="absolute -right-20 -top-20 h-64 w-64 rounded-full bg-white/10 blur-3xl"
            animate={{ x: [0, 20, 0], y: [0, -15, 0] }}
            transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          />
          <div className="relative px-8 py-16 text-center sm:px-16 sm:py-20">
            <h2 className="text-balance text-3xl font-bold tracking-tight text-white sm:text-4xl lg:text-5xl">
              Start your global savings circle
            </h2>
            <p className="mx-auto mt-4 max-w-lg text-base text-white/80 sm:text-lg">
              Join communities building wealth together on Stellar. Free to start,
              transparent by design, investor-ready from day one.
            </p>
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <PremiumButton
                href="/register"
                variant="glass"
                size="lg"
                className="border-white/20 bg-white/15 text-white hover:border-white/30 hover:bg-white/25"
              >
                Create your free account <ArrowRight className="h-4 w-4" />
              </PremiumButton>
            </div>
            <p className="mt-6 text-xs text-white/50">
              Stellar Testnet · Non-custodial · Real on-chain transactions
            </p>
          </div>
        </motion.div>
      </section>

      {/* ── Footer ─────────────────────────────────────────────────── */}
      <footer className="border-t border-border/40">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:flex-row sm:px-6 lg:px-8">
          <Wordmark />
          <p>
            © <span suppressHydrationWarning>{new Date().getFullYear()}</span> Pamodzi Finance. Community wealth, moving on
            Stellar.
          </p>
          <span className="inline-flex items-center gap-1.5 text-xs">
            <span className="relative flex h-2 w-2">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--success))] opacity-60" />
              <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
            </span>
            Stellar Testnet
          </span>
        </div>
      </footer>
    </div>
  );
}
