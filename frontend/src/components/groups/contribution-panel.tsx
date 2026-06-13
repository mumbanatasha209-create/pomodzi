"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/api";
import { formatAmount, formatDate } from "@/lib/utils";
import type { Contribution, SavingsGroup } from "@/lib/types";

export function ContributionPanel({
  group,
  contributions,
  onContributed,
}: {
  group: SavingsGroup;
  contributions: Contribution[];
  onContributed?: () => void;
}) {
  const defaultAmount = Number(group.contribution_amount) || 0;
  const [amount, setAmount] = useState(String(defaultAmount));
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleContribute(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await api.contribute(group.id, { amount: Number(amount) });
      onContributed?.();
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Contribution failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleContribute} className="space-y-3">
        <div className="space-y-1.5">
          <Label htmlFor="amount">Contribute to cycle {group.current_cycle}</Label>
          <Input
            id="amount"
            type="number"
            min="0"
            step="0.0000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button type="submit" className="w-full" disabled={submitting}>
          {submitting ? "Processing…" : `Pay ${formatAmount(amount, group.currency)}`}
        </Button>
      </form>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Recent contributions</h3>
        {contributions.length === 0 ? (
          <p className="text-sm text-muted-foreground">No contributions yet.</p>
        ) : (
          <ul className="divide-y">
            {contributions.slice(0, 8).map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2.5 text-sm">
                <div>
                  <p className="font-medium">{c.full_name ?? "Member"}</p>
                  <p className="text-xs text-muted-foreground">
                    Cycle {c.cycle} · {formatDate(c.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">
                    {formatAmount(c.amount, group.currency)}
                  </span>
                  <Badge variant={c.status === "paid" ? "success" : "warning"}>
                    {c.status}
                  </Badge>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
