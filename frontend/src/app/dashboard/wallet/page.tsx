"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowDownLeft,
  ArrowUpRight,
  Copy,
  ExternalLink,
  ShieldCheck,
  Wallet as WalletIcon,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { AreaTrend, makeSeries } from "@/components/ui/charts";
import { EmptyState } from "@/components/shared/empty-state";
import { api } from "@/lib/api";
import { transactionLabel } from "@/lib/config/transaction-labels";
import { formatAmount, formatDate } from "@/lib/utils";
import type { Transaction, Wallet } from "@/lib/types";

export default function WalletPage() {
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    Promise.allSettled([api.wallet(), api.transactions()]).then(([w, t]) => {
      if (w.status === "fulfilled") setWallet(w.value);
      if (t.status === "fulfilled") setTxns(t.value);
      setLoading(false);
    });
  }, []);

  function copyKey() {
    if (wallet?.public_key) {
      void navigator.clipboard?.writeText(wallet.public_key);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  const inflow = (t: Transaction) =>
    t.tx_type === "wallet_funding" || t.tx_type === "payout";

  const balance = wallet ? Number(wallet.balance) || 0 : 0;
  const series = useMemo(
    () => makeSeries(Math.round(balance) + 11, 14, Math.max(balance, 40), 0.25),
    [balance],
  );

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">Digital Wallet</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Stellar-powered wallet for cross-border contributions and rotating payouts.
          </p>
        </div>

        <div className="grid gap-4 lg:grid-cols-3">
          {/* Balance card */}
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
                  <p className="flex items-center gap-2 text-sm text-primary-foreground/80">
                    <WalletIcon className="h-4 w-4" /> XLM balance
                  </p>
                  {loading ? (
                    <Skeleton className="mt-2 h-10 w-56 bg-primary-foreground/20" />
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

              {wallet?.public_key ? (
                <div className="relative mt-5 flex items-center justify-between gap-2 rounded-xl bg-background/15 px-3 py-2.5">
                  <span className="truncate font-mono text-xs text-primary-foreground/90">
                    {wallet.public_key}
                  </span>
                  <div className="flex shrink-0 items-center gap-1">
                    <button
                      onClick={copyKey}
                      className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors hover:bg-background/20"
                    >
                      <Copy className="h-3.5 w-3.5" /> {copied ? "Copied" : "Copy"}
                    </button>
                    {wallet.explorer_url ? (
                      <a
                        href={wallet.explorer_url}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-medium transition-colors hover:bg-background/20"
                      >
                        <ExternalLink className="h-3.5 w-3.5" /> Explorer
                      </a>
                    ) : null}
                  </div>
                </div>
              ) : null}

              <p className="relative mt-4 text-xs text-primary-foreground/75">
                This wallet is currently using Stellar Testnet for demo transactions.
              </p>
            </Card>
          </motion.div>

          {/* Balances + network */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.06 }}
            className="space-y-4"
          >
            <Card className="p-5">
              <p className="text-sm text-muted-foreground">USDC balance (demo)</p>
              <p className="tabular mt-1 text-2xl font-bold">0.00 USDC</p>
              <Badge variant="secondary" className="mt-2">
                Placeholder — testnet demo
              </Badge>
            </Card>
            <Card className="p-5">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[hsl(var(--success)/0.14)] text-[hsl(var(--success))]">
                <ShieldCheck className="h-5 w-5" />
              </div>
              <p className="mt-3 font-semibold">Stellar network</p>
              <p className="mt-1 text-sm text-muted-foreground">
                Network: Testnet · Explorer link available when funded.
              </p>
              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Network</span>
                  <Badge variant="chain">Testnet</Badge>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-muted-foreground">Asset</span>
                  <span className="font-medium">{wallet?.asset ?? "XLM"}</span>
                </div>
              </div>
            </Card>
          </motion.div>
        </div>

        {/* Balance trend */}
        <Card>
          <CardHeader className="flex-row items-center justify-between">
            <CardTitle className="text-base">Balance trend</CardTitle>
            <Badge variant="secondary">Last 14 cycles</Badge>
          </CardHeader>
          <CardContent>
            {loading ? (
              <Skeleton className="h-[220px] w-full" />
            ) : (
              <AreaTrend data={series} suffix="XLM" />
            )}
          </CardContent>
        </Card>

        {/* Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent Stellar activity</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-5">
                {[0, 1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-28" />
                      <Skeleton className="mt-1.5 h-3 w-16" />
                    </div>
                    <Skeleton className="h-4 w-16" />
                  </div>
                ))}
              </div>
            ) : txns.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={WalletIcon}
                  title="No transactions yet"
                  description="Once you fund or contribute, your activity shows up here."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {txns.slice(0, 12).map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center justify-between px-5 py-3.5"
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className={
                          "flex h-9 w-9 items-center justify-center rounded-full " +
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
                      <div>
                        <p className="text-sm font-medium">
                          {transactionLabel(t.tx_type)}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(t.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p
                        className={
                          "tabular text-sm font-semibold " +
                          (inflow(t) ? "text-[hsl(var(--success))]" : "")
                        }
                      >
                        {inflow(t) ? "+" : "-"}
                        {formatAmount(t.amount, t.currency)}
                      </p>
                      <Badge
                        variant={
                          t.status === "success"
                            ? "success"
                            : t.status === "failed"
                              ? "destructive"
                              : "warning"
                        }
                      >
                        {t.status}
                      </Badge>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
