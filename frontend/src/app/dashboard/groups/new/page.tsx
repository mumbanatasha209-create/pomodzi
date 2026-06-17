"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarDays, CalendarRange, Loader2, Sparkles } from "lucide-react";
import Link from "next/link";
import { motion } from "framer-motion";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { cn, formatAmount, parseMoneyInput } from "@/lib/utils";
import { useAuth } from "@/context/auth-context";
import { api, ApiError } from "@/lib/api";
import type { ContributionFrequency } from "@/lib/types";

export default function NewGroupPage() {
  const router = useRouter();
  const { refresh } = useAuth();
  const [form, setForm] = useState({
    name: "",
    description: "",
    contribution_amount: "",
    currency: "XLM",
    frequency: "monthly" as ContributionFrequency,
  });
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const group = await api.createGroup({
        name: form.name,
        description: form.description || undefined,
        contribution_amount: parseMoneyInput(form.contribution_amount),
        currency: form.currency,
        frequency: form.frequency,
      });
      await refresh();
      router.push(`/dashboard/groups/${group.id}`);
    } catch (err) {
      setError(err instanceof ApiError ? err.message : "Could not create group");
      setLoading(false);
    }
  }

  const amount = Number(form.contribution_amount) || 0;

  return (
    <AppShell>
      <div className="mx-auto max-w-2xl space-y-5">
        <Link
          href="/dashboard/groups"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to circles
        </Link>

        <div>
          <h1 className="text-2xl font-bold tracking-tight">
            Create a savings circle
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Set the terms — members contribute each cycle and payouts rotate
            automatically.
          </p>
        </div>

        <Card>
          <CardContent className="p-5 sm:p-6">
            <form onSubmit={handleSubmit} className="space-y-5">
              <div className="space-y-1.5">
                <Label htmlFor="name">Circle name</Label>
                <Input
                  id="name"
                  placeholder="e.g. Lusaka Builders Chama"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="What is this circle saving for?"
                  value={form.description}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, description: e.target.value }))
                  }
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label htmlFor="amount">Contribution</Label>
                  <Input
                    id="amount"
                    type="number"
                    min="0"
                    step="0.0000001"
                    placeholder="100"
                    value={form.contribution_amount}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        contribution_amount: e.target.value,
                      }))
                    }
                    className="tabular"
                    required
                  />
                </div>
                <div className="space-y-1.5">
                  <Label htmlFor="currency">Currency</Label>
                  <Input
                    id="currency"
                    value={form.currency}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, currency: e.target.value }))
                    }
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <Label>Frequency</Label>
                <div className="grid grid-cols-2 gap-3">
                  {(
                    [
                      { v: "weekly", label: "Weekly", icon: CalendarDays },
                      { v: "monthly", label: "Monthly", icon: CalendarRange },
                    ] as const
                  ).map((opt) => {
                    const active = form.frequency === opt.v;
                    const Icon = opt.icon;
                    return (
                      <button
                        type="button"
                        key={opt.v}
                        onClick={() =>
                          setForm((f) => ({ ...f, frequency: opt.v }))
                        }
                        className={cn(
                          "flex items-center gap-3 rounded-xl border p-3.5 text-left transition-all",
                          active
                            ? "border-primary/60 bg-primary/10 ring-4 ring-primary/10"
                            : "border-border hover:border-border/80 hover:bg-secondary/50",
                        )}
                      >
                        <span
                          className={cn(
                            "flex h-9 w-9 items-center justify-center rounded-lg",
                            active
                              ? "brand-gradient text-primary-foreground"
                              : "bg-secondary text-muted-foreground",
                          )}
                        >
                          <Icon className="h-4 w-4" />
                        </span>
                        <span className="text-sm font-medium">{opt.label}</span>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Live preview */}
              <motion.div
                layout
                className="rounded-xl border border-border/60 bg-secondary/30 p-4"
              >
                <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
                  <Sparkles className="h-3.5 w-3.5 text-primary" /> Preview
                </div>
                <div className="mt-2 flex items-center justify-between">
                  <p className="font-semibold">
                    {form.name || "Your circle name"}
                  </p>
                  <p className="tabular text-sm font-semibold text-primary">
                    {formatAmount(amount, form.currency)}
                    <span className="text-muted-foreground">
                      {" "}
                      / {form.frequency}
                    </span>
                  </p>
                </div>
              </motion.div>

              {error ? (
                <p className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {error}
                </p>
              ) : null}

              <Button
                type="submit"
                size="lg"
                className="w-full"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Creating…
                  </>
                ) : (
                  "Create circle"
                )}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
