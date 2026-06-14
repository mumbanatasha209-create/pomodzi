"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, Coins, Loader2, PartyPopper, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { api, ApiError } from "@/lib/api";
import { formatAmount, formatDate } from "@/lib/utils";
import type { Contribution, ContributeResponse, SavingsGroup } from "@/lib/types";

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
  const [result, setResult] = useState<ContributeResponse | null>(null);

  async function handleContribute(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    setResult(null);
    try {
      const res = await api.contribute(group.id, { amount: Number(amount) });
      setResult(res);
      onContributed?.();
      setTimeout(() => setResult(null), 6000);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Contribution failed");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="space-y-5">
      <form onSubmit={handleContribute} className="space-y-3">
        <Label htmlFor="amount" className="flex items-center gap-1.5">
          <Coins className="h-3.5 w-3.5 text-primary" />
          Contribute to cycle {group.current_cycle}
        </Label>
        <div className="relative">
          <Input
            id="amount"
            type="number"
            min="0"
            step="0.0000001"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="tabular h-12 pr-16 text-lg font-semibold"
            required
          />
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-medium text-muted-foreground">
            {group.currency}
          </span>
        </div>

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <Button
          type="submit"
          size="lg"
          className="w-full"
          disabled={submitting}
        >
          {submitting ? (
            <>
              <Loader2 className="h-4 w-4 animate-spin" /> Processing on-chain…
            </>
          ) : (
            <>
              <Wallet className="h-4 w-4" /> Pay{" "}
              {formatAmount(amount, group.currency)}
            </>
          )}
        </Button>
      </form>

      {/* Success / payout celebration */}
      <AnimatePresence>
        {result ? (
          <motion.div
            initial={{ opacity: 0, y: 8, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, scale: 0.98 }}
            className={
              result.payout_triggered
                ? "rounded-xl border border-[hsl(var(--brand-violet)/0.4)] bg-[hsl(var(--brand-violet)/0.1)] p-4"
                : "rounded-xl border border-[hsl(var(--success)/0.4)] bg-[hsl(var(--success)/0.1)] p-4"
            }
          >
            <div className="flex items-start gap-3">
              {result.payout_triggered ? (
                <PartyPopper className="mt-0.5 h-5 w-5 text-[hsl(var(--brand-violet))]" />
              ) : (
                <CheckCircle2 className="mt-0.5 h-5 w-5 text-[hsl(var(--success))]" />
              )}
              <div>
                <p className="text-sm font-semibold">
                  {result.payout_triggered
                    ? "Cycle complete — payout sent!"
                    : "Contribution recorded"}
                </p>
                <p className="text-sm text-muted-foreground">
                  {result.payout_triggered
                    ? "Every member has paid. The rotating payout was processed and the next cycle has begun."
                    : "Your contribution for this cycle is confirmed on the ledger."}
                </p>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>

      <div>
        <h3 className="mb-2 text-sm font-semibold">Recent contributions</h3>
        {contributions.length === 0 ? (
          <p className="rounded-lg border border-dashed border-border/70 py-6 text-center text-sm text-muted-foreground">
            No contributions yet — be the first to pay in.
          </p>
        ) : (
          <ul className="divide-y divide-border/60">
            {contributions.slice(0, 8).map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium">{c.full_name ?? "Member"}</p>
                  <p className="text-xs text-muted-foreground">
                    Cycle {c.cycle} · {formatDate(c.created_at)}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="tabular font-medium">
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
