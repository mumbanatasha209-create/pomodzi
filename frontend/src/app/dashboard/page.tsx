"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Plus, Shield, Wallet as WalletIcon } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { GroupCard } from "@/components/groups/group-card";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { formatAmount } from "@/lib/utils";
import type { SavingsGroup, Wallet } from "@/lib/types";

export default function DashboardPage() {
  const { user } = useAuth();
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [groups, setGroups] = useState<SavingsGroup[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    Promise.allSettled([api.wallet(), api.listGroups()]).then(([w, g]) => {
      if (!active) return;
      if (w.status === "fulfilled") setWallet(w.value);
      if (g.status === "fulfilled") setGroups(g.value);
      setLoading(false);
    });
    return () => {
      active = false;
    };
  }, []);

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">
            Hi {user?.full_name?.split(" ")[0] ?? "there"} 👋
          </h1>
          <p className="text-sm text-muted-foreground capitalize">
            {user?.role?.replace("_", " ")} account
          </p>
        </div>

        <Card className="brand-gradient border-0 text-white">
          <CardContent className="flex items-center justify-between p-5">
            <div>
              <p className="flex items-center gap-2 text-sm text-white/80">
                <WalletIcon className="h-4 w-4" /> Wallet balance
              </p>
              <p className="mt-1 text-3xl font-bold">
                {wallet ? formatAmount(wallet.balance, wallet.asset) : loading ? "…" : formatAmount(0)}
              </p>
            </div>
            <Link href="/dashboard/wallet">
              <Button variant="secondary" size="sm">
                Manage <ArrowRight className="h-4 w-4" />
              </Button>
            </Link>
          </CardContent>
        </Card>

        {user?.role === "platform_admin" ? (
          <Link href="/dashboard/admin">
            <Card className="transition-shadow hover:shadow-md">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Shield className="h-5 w-5" />
                </div>
                <div className="flex-1">
                  <p className="font-medium">Platform administration</p>
                  <p className="text-sm text-muted-foreground">
                    Manage users, groups and audit logs
                  </p>
                </div>
                <ArrowRight className="h-4 w-4 text-muted-foreground" />
              </CardContent>
            </Card>
          </Link>
        ) : null}

        <div>
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold">Your groups</h2>
            <Link href="/dashboard/groups/new">
              <Button size="sm" variant="outline">
                <Plus className="h-4 w-4" /> New
              </Button>
            </Link>
          </div>
          {loading ? (
            <p className="text-sm text-muted-foreground">Loading groups…</p>
          ) : groups.length === 0 ? (
            <Card>
              <CardContent className="p-6 text-center">
                <p className="text-sm text-muted-foreground">
                  You are not in any savings groups yet.
                </p>
                <Link href="/dashboard/groups/new">
                  <Button className="mt-4">
                    <Plus className="h-4 w-4" /> Create a group
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {groups.slice(0, 4).map((g) => (
                <GroupCard key={g.id} group={g} />
              ))}
            </div>
          )}
          {groups.length > 4 ? (
            <Link
              href="/dashboard/groups"
              className="mt-3 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
            >
              View all groups <ArrowRight className="h-4 w-4" />
            </Link>
          ) : null}
        </div>
      </div>
    </AppShell>
  );
}
