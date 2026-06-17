"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowRight,
  ArrowUpRight,
  Coins,
  Copy,
  Plus,
  Receipt,
  Repeat,
  Shield,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { GroupCard } from "@/components/groups/group-card";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { makeSeries } from "@/components/ui/charts";
import { StatCard } from "@/components/shared/stat-card";
import { BlockchainActivity } from "@/components/shared/blockchain-activity";
import { EmptyState } from "@/components/shared/empty-state";
import { Stagger, staggerItem } from "@/components/shared/reveal";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { transactionLabel } from "@/lib/config/transaction-labels";
import { formatAmount, formatDate } from "@/lib/utils";
import type { SavingsGroup, Transaction, Wallet } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [groups, setGroups] = useState<SavingsGroup[]>([]);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let active = true;
    Promise.allSettled([api.wallet(), api.listGroups(), api.transactions()]).then(
      ([w, g, t]) => {
        if (!active) return;
        if (w.status === "fulfilled") setWallet(w.value);
        if (g.status === "fulfilled") setGroups(g.value);
        if (t.status === "fulfilled") setTxns(t.value);
        setLoading(false);
      },
    );
    return () => {
      active = false;
    };
  }, []);

  const balance = wallet ? Number(wallet.balance) || 0 : 0;
  const totalContributed = useMemo(
    () =>
      txns
        .filter((t) => t.tx_type === "contribution")
        .reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [txns],
  );
  const totalReceived = useMemo(
    () =>
      txns
        .filter((t) => t.tx_type === "payout")
        .reduce((s, t) => s + (Number(t.amount) || 0), 0),
    [txns],
  );

  function copyKey() {
    if (wallet?.public_key) {
      void navigator.clipboard?.writeText(wallet.public_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  const inflow = (t: Transaction) =>
    t.tx_type === "wallet_funding" || t.tx_type === "payout";

  return (
    <AppShell>
      <div className="space-y-6">
        {/* Greeting */}
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <p className="text-sm text-muted-foreground">
              {new Date().toLocaleDateString(undefined, {
                weekday: "long",
                month: "long",
                day: "numeric",
              })}
            </p>
            <h1 className="mt-0.5 text-2xl font-bold tracking-tight sm:text-3xl">
              Welcome back, {user?.full_name?.split(" ")[0] ?? "there"}
            </h1>
          </div>
          <Link href="/dashboard/groups/new">
            <Button size="sm">
              <Plus className="h-4 w-4" /> New circle
            </Button>
          </Link>
        </div>

        {/* Hero + side metrics */}
        <div className="grid gap-4 lg:grid-cols-3">
          {/* Balance hero */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="lg:col-span-2"
          >
            <Card className="relative overflow-hidden border-0 brand-gradient p-6 text-primary-foreground shadow-glow">
              <div className="absolute inset-0 bg-grid opacity-15" />
              <div className="relative flex items-start justify-between">
                <div>
                  <p className="text-sm text-primary-foreground/80">
                    Total Wallet Balance
                  </p>
                  {loading ? (
                    <Skeleton className="mt-2 h-9 w-48 bg-primary-foreground/20" />
                  ) : (
                    <p className="tabular mt-1 text-4xl font-bold tracking-tight">
                      <AnimatedNumber value={balance} decimals={2} suffix=" XLM" />
                    </p>
                  )}
                </div>
                <span className="inline-flex items-center gap-1.5 rounded-full bg-background/15 px-2.5 py-1 text-xs font-medium">
                  <span className="live-dot relative flex h-2 w-2 rounded-full bg-background/90" />
                  Testnet
                </span>
              </div>
              <p className="relative mt-2 text-xs text-primary-foreground/70">
                Stellar Testnet Status · Cross-Border Ready
              </p>

              {wallet?.public_key ? (
                <button
                  onClick={copyKey}
                  className="relative mt-5 flex w-full items-center justify-between gap-2 rounded-xl bg-background/15 px-3 py-2.5 text-left transition-colors hover:bg-background/25"
                >
                  <span className="truncate font-mono text-xs text-primary-foreground/90">
                    {wallet.public_key}
                  </span>
                  <span className="flex items-center gap-1 text-xs font-medium">
                    <Copy className="h-3.5 w-3.5" />
                    {copied ? "Copied" : "Copy"}
                  </span>
                </button>
              ) : null}

              <div className="relative mt-4 grid grid-cols-2 gap-3">
                <Link href="/dashboard/wallet">
                  <Button
                    variant="glass"
                    size="sm"
                    className="w-full bg-background/15 text-primary-foreground hover:bg-background/25"
                  >
                    Manage wallet <ArrowRight className="h-4 w-4" />
                  </Button>
                </Link>
                <Link href="/dashboard/groups">
                  <Button
                    variant="glass"
                    size="sm"
                    className="w-full bg-background/15 text-primary-foreground hover:bg-background/25"
                  >
                    View circles
                  </Button>
                </Link>
              </div>
            </Card>
          </motion.div>

          {/* Blockchain activity */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.08 }}
          >
            <BlockchainActivity />
          </motion.div>
        </div>

        {/* Metric stat cards */}
        <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Active Savings Circles"
            value={groups.filter((g) => g.status === "active").length}
            icon={Users}
            series={makeSeries(groups.length + 3, 10, 40, 0.5)}
          />
          <StatCard
            label="Contributions This Cycle"
            value={totalContributed}
            decimals={0}
            suffix=" XLM"
            icon={Coins}
            color="hsl(var(--chart-2))"
            series={makeSeries(9, 10, 80, 0.6)}
          />
          <StatCard
            label="Next Payout"
            value={totalReceived}
            decimals={0}
            suffix=" XLM"
            icon={Repeat}
            color="hsl(var(--chart-3))"
            series={makeSeries(13, 10, 60, 0.7)}
          />
          <StatCard
            label="Treasury Activity"
            value={txns.length}
            icon={Receipt}
            color="hsl(var(--chart-5))"
            series={makeSeries(5, 10, 50, 0.5)}
          />
        </Stagger>

        {/* Admin shortcut */}
        {user?.role === "platform_admin" ? (
          <Link href="/dashboard/admin">
            <Card hover className="flex items-center gap-3 p-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--brand-violet)/0.16)] text-[hsl(var(--brand-violet))]">
                <Shield className="h-5 w-5" />
              </div>
              <div className="flex-1">
                <p className="font-medium">Platform administration</p>
                <p className="text-sm text-muted-foreground">
                  Manage users, groups and audit logs
                </p>
              </div>
              <ArrowRight className="h-4 w-4 text-muted-foreground" />
            </Card>
          </Link>
        ) : null}

        {/* Groups + activity */}
        <div className="grid gap-6 lg:grid-cols-3">
          {/* Groups */}
          <div className="lg:col-span-2">
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Your circles</h2>
              <Link
                href="/dashboard/groups"
                className="inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
              >
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </div>

            {loading ? (
              <div className="grid gap-3 sm:grid-cols-2">
                {[0, 1].map((i) => (
                  <Card key={i} className="p-5">
                    <Skeleton className="h-5 w-32" />
                    <Skeleton className="mt-3 h-4 w-full" />
                    <Skeleton className="mt-4 h-4 w-24" />
                  </Card>
                ))}
              </div>
            ) : groups.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No circles yet"
                description="Create your first savings circle or join one with an invite code."
                action={
                  <Link href="/dashboard/groups/new">
                    <Button>
                      <Plus className="h-4 w-4" /> Create a circle
                    </Button>
                  </Link>
                }
              />
            ) : (
              <Stagger className="grid gap-3 sm:grid-cols-2">
                {groups.slice(0, 4).map((g) => (
                  <motion.div key={g.id} variants={staggerItem}>
                    <GroupCard group={g} />
                  </motion.div>
                ))}
              </Stagger>
            )}
          </div>

          {/* Recent activity */}
          <div>
            <div className="mb-3 flex items-center justify-between">
              <h2 className="text-lg font-semibold">Recent activity</h2>
              <Link
                href="/dashboard/transactions"
                className="text-sm font-medium text-primary hover:underline"
              >
                All
              </Link>
            </div>
            <Card className="overflow-hidden">
              {loading ? (
                <div className="space-y-3 p-4">
                  {[0, 1, 2].map((i) => (
                    <div key={i} className="flex items-center gap-3">
                      <Skeleton className="h-9 w-9 rounded-full" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-24" />
                        <Skeleton className="mt-1.5 h-3 w-16" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : txns.length === 0 ? (
                <p className="p-6 text-center text-sm text-muted-foreground">
                  No activity yet.
                </p>
              ) : (
                <ul className="divide-y divide-border/60">
                  {txns.slice(0, 6).map((t) => (
                    <li
                      key={t.id}
                      className="flex items-center gap-3 px-4 py-3"
                    >
                      <div
                        className={
                          "flex h-9 w-9 shrink-0 items-center justify-center rounded-full " +
                          (inflow(t)
                            ? "bg-[hsl(var(--success)/0.14)] text-[hsl(var(--success))]"
                            : "bg-secondary text-foreground")
                        }
                      >
                        {inflow(t) ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">
                          {transactionLabel(t.tx_type)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(t.created_at)}
                        </p>
                      </div>
                      <span className="tabular shrink-0 text-sm font-semibold">
                        {inflow(t) ? "+" : "-"}
                        {formatAmount(t.amount, t.currency)}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
