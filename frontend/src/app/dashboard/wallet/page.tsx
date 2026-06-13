"use client";

import { useEffect, useState } from "react";
import { ArrowDownLeft, ArrowUpRight, Copy, Wallet as WalletIcon } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { api } from "@/lib/api";
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
    }
  }

  const inflow = (t: Transaction) =>
    t.tx_type === "wallet_funding" || t.tx_type === "payout";

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Wallet</h1>

        <Card className="brand-gradient border-0 text-white">
          <CardContent className="p-5">
            <p className="flex items-center gap-2 text-sm text-white/80">
              <WalletIcon className="h-4 w-4" /> Available balance
            </p>
            <p className="mt-1 text-3xl font-bold">
              {wallet ? formatAmount(wallet.balance, wallet.asset) : loading ? "…" : formatAmount(0)}
            </p>
            {wallet?.public_key ? (
              <div className="mt-4 flex items-center justify-between gap-2 rounded-lg bg-white/15 px-3 py-2">
                <span className="truncate font-mono text-xs">
                  {wallet.public_key}
                </span>
                <Button variant="secondary" size="sm" onClick={copyKey}>
                  <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy"}
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Recent activity</CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-muted-foreground">Loading…</p>
            ) : txns.length === 0 ? (
              <p className="text-sm text-muted-foreground">No transactions yet.</p>
            ) : (
              <ul className="divide-y">
                {txns.slice(0, 12).map((t) => (
                  <li key={t.id} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div
                        className={
                          "flex h-9 w-9 items-center justify-center rounded-full " +
                          (inflow(t) ? "bg-emerald-100 text-emerald-700" : "bg-secondary text-foreground")
                        }
                      >
                        {inflow(t) ? (
                          <ArrowDownLeft className="h-4 w-4" />
                        ) : (
                          <ArrowUpRight className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-medium capitalize">
                          {t.tx_type.replace("_", " ")}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(t.created_at)}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium">
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
