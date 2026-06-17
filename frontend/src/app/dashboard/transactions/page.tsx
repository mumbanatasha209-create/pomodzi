"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { ArrowDownLeft, ArrowUpRight, Receipt } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { api } from "@/lib/api";
import { transactionLabel } from "@/lib/config/transaction-labels";
import { cn, formatAmount, formatDate, stellarExplorerTxUrl } from "@/lib/utils";
import type { Transaction, TxStatus, TxType } from "@/lib/types";

const statusVariant: Record<TxStatus, "success" | "warning" | "destructive"> = {
  success: "success",
  pending: "warning",
  failed: "destructive",
};

const filters: { id: "all" | TxType | "cross_border_contribution"; label: string }[] = [
  { id: "all", label: "All" },
  { id: "wallet_funding", label: "Wallet Funding" },
  { id: "contribution", label: "Group Contribution" },
  { id: "cross_border_contribution", label: "Cross-Border" },
  { id: "payout", label: "Rotating Payout" },
];

export default function TransactionsPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState<"all" | TxType | "cross_border_contribution">("all");

  useEffect(() => {
    api
      .transactions()
      .then(setTxns)
      .catch(() => setTxns([]))
      .finally(() => setLoading(false));
  }, []);

  const inflow = (t: Transaction) =>
    t.tx_type === "wallet_funding" || t.tx_type === "payout";

  const filtered = useMemo(
    () => (active === "all" ? txns : txns.filter((t) => t.tx_type === active)),
    [txns, active],
  );

  const totals = useMemo(() => {
    let inAmt = 0;
    let outAmt = 0;
    for (const t of txns) {
      const v = Number(t.amount) || 0;
      if (inflow(t)) inAmt += v;
      else outAmt += v;
    }
    return { inAmt, outAmt };
  }, [txns]);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Transactions
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            A transparent ledger of every movement across your wallet and circles.
          </p>
        </div>

        {/* Summary */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total in</p>
            <p className="tabular mt-1 text-lg font-bold text-[hsl(var(--success))]">
              +{formatAmount(totals.inAmt)}
            </p>
          </Card>
          <Card className="p-4">
            <p className="text-xs text-muted-foreground">Total out</p>
            <p className="tabular mt-1 text-lg font-bold">
              -{formatAmount(totals.outAmt)}
            </p>
          </Card>
          <Card className="col-span-2 p-4 sm:col-span-1">
            <p className="text-xs text-muted-foreground">Records</p>
            <p className="tabular mt-1 text-lg font-bold">{txns.length}</p>
          </Card>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap gap-2">
          {filters.map((f) => {
            const isActive = active === f.id;
            return (
              <button
                key={f.id}
                onClick={() => setActive(f.id)}
                className={cn(
                  "relative rounded-full px-3.5 py-1.5 text-sm font-medium transition-colors",
                  isActive
                    ? "text-primary-foreground"
                    : "text-muted-foreground hover:text-foreground",
                )}
              >
                {isActive && (
                  <motion.span
                    layoutId="txn-filter"
                    className="absolute inset-0 -z-10 rounded-full brand-gradient"
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                  />
                )}
                {f.label}
              </button>
            );
          })}
        </div>

        <Card>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-5">
                {[0, 1, 2, 3, 4].map((i) => (
                  <div key={i} className="flex items-center gap-3">
                    <Skeleton className="h-9 w-9 rounded-full" />
                    <div className="flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="mt-1.5 h-3 w-20" />
                    </div>
                    <Skeleton className="h-4 w-20" />
                  </div>
                ))}
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-5">
                <EmptyState
                  icon={Receipt}
                  title="No transactions"
                  description="Nothing to show for this filter yet."
                />
              </div>
            ) : (
              <ul className="divide-y divide-border/60">
                {filtered.map((t, i) => (
                  <motion.li
                    key={t.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: Math.min(i * 0.02, 0.3) }}
                    className="flex items-center justify-between gap-3 px-5 py-3.5"
                  >
                    <div className="flex min-w-0 items-center gap-3">
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
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium capitalize">
                          {transactionLabel(t.tx_type)}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {formatDate(t.created_at)}
                          {t.memo ? ` · ${t.memo}` : ""}
                          {t.transaction_source === "stellar_testnet" && t.blockchain_hash ? (
                            <>
                              {" · "}
                              <a
                                href={stellarExplorerTxUrl(t.blockchain_hash)}
                                target="_blank"
                                rel="noreferrer"
                                className="text-primary hover:underline"
                              >
                                View on Stellar
                              </a>
                            </>
                          ) : null}
                        </p>
                      </div>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span
                        className={cn(
                          "tabular text-sm font-semibold",
                          inflow(t) && "text-[hsl(var(--success))]",
                        )}
                      >
                        {inflow(t) ? "+" : "-"}
                        {formatAmount(t.amount, t.currency)}
                      </span>
                      <Badge variant={statusVariant[t.status]}>{t.status}</Badge>
                    </div>
                  </motion.li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
