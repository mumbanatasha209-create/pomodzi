"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
        contribution_amount: Number(form.contribution_amount),
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

  return (
    <AppShell>
      <div className="mx-auto max-w-lg space-y-5">
        <Link
          href="/dashboard/groups"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to groups
        </Link>
        <Card>
          <CardHeader>
            <CardTitle>Create a savings group</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-1.5">
                <Label htmlFor="name">Group name</Label>
                <Input
                  id="name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
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
                    value={form.contribution_amount}
                    onChange={(e) =>
                      setForm((f) => ({ ...f, contribution_amount: e.target.value }))
                    }
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
                <Label htmlFor="frequency">Frequency</Label>
                <select
                  id="frequency"
                  value={form.frequency}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      frequency: e.target.value as ContributionFrequency,
                    }))
                  }
                  className="flex h-11 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </div>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
              <Button type="submit" className="w-full" disabled={loading}>
                {loading ? "Creating…" : "Create group"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}
