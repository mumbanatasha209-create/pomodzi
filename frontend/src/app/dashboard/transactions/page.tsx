"use client";

import { useEffect, useState } from "react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { api } from "@/lib/api";
import { formatAmount, formatDate } from "@/lib/utils";
import type { Transaction, TxStatus } from "@/lib/types";

const statusVariant: Record<TxStatus, "success" | "warning" | "destructive"> = {
  success: "success",
  pending: "warning",
  failed: "destructive",
};

export default function TransactionsPage() {
  const [txns, setTxns] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .transactions()
      .then(setTxns)
      .catch(() => setTxns([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Transactions</h1>
        <Card>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-5 text-sm text-muted-foreground">Loading…</p>
            ) : txns.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">
                No transactions to show.
              </p>
            ) : (
              <ul className="divide-y">
                {txns.map((t) => (
                  <li key={t.id} className="flex items-center justify-between gap-3 px-5 py-3.5">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium capitalize">
                        {t.tx_type.replace("_", " ")}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(t.created_at)}
                        {t.memo ? ` · ${t.memo}` : ""}
                      </p>
                    </div>
                    <div className="flex shrink-0 items-center gap-3">
                      <span className="text-sm font-medium">
                        {formatAmount(t.amount, t.currency)}
                      </span>
                      <Badge variant={statusVariant[t.status]}>{t.status}</Badge>
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
