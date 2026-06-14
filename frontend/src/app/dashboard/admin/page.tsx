"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Activity,
  Coins,
  Layers,
  Receipt,
  Repeat,
  ScrollText,
  ShieldAlert,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { BarTrend, makeSeries } from "@/components/ui/charts";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { Stagger } from "@/components/shared/reveal";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { formatAmount, formatDate, initials } from "@/lib/utils";
import type { AdminStats, AuditLog, SavingsGroup, User } from "@/lib/types";

export default function AdminPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();

  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [groups, setGroups] = useState<SavingsGroup[]>([]);
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && user && user.role !== "platform_admin") {
      router.replace("/dashboard");
    }
  }, [authLoading, user, router]);

  useEffect(() => {
    if (user?.role !== "platform_admin") return;
    Promise.allSettled([
      api.adminStats(),
      api.adminUsers(),
      api.adminGroups(),
      api.adminAuditLogs(),
    ]).then(([s, u, g, l]) => {
      if (s.status === "fulfilled") setStats(s.value);
      if (u.status === "fulfilled") setUsers(u.value);
      if (g.status === "fulfilled") setGroups(g.value);
      if (l.status === "fulfilled") setLogs(l.value);
      setLoading(false);
    });
  }, [user]);

  if (user && user.role !== "platform_admin") {
    return (
      <AppShell>
        <EmptyState
          icon={ShieldAlert}
          title="Access restricted"
          description="You do not have permission to view the platform admin area."
        />
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center gap-2">
          <Badge variant="chain" dot>
            Platform admin
          </Badge>
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Platform overview
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Oversight of users, circles and on-chain activity across Pamodzi.
          </p>
        </div>

        {/* Metrics */}
        <Stagger className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <StatCard
            label="Total users"
            value={stats?.users ?? 0}
            icon={Users}
            series={makeSeries(3, 10, 60, 0.5)}
          />
          <StatCard
            label="Circles"
            value={stats?.groups ?? 0}
            icon={Layers}
            color="hsl(var(--chart-2))"
            series={makeSeries(8, 10, 40, 0.5)}
          />
          <StatCard
            label="Contributions"
            value={stats?.contributions_paid ?? 0}
            icon={Coins}
            color="hsl(var(--chart-3))"
            series={makeSeries(11, 10, 70, 0.6)}
          />
          <StatCard
            label="Payouts"
            value={stats?.payouts_completed ?? 0}
            icon={Repeat}
            color="hsl(var(--chart-4))"
            series={makeSeries(6, 10, 50, 0.6)}
          />
        </Stagger>

        {/* Activity chart + quick stats */}
        <div className="grid gap-4 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader className="flex-row items-center justify-between">
              <CardTitle className="text-base">Platform activity</CardTitle>
              <Badge variant="secondary">
                <Activity className="h-3 w-3" /> Live
              </Badge>
            </CardHeader>
            <CardContent>
              <BarTrend data={makeSeries(4, 12, 80, 0.7)} />
            </CardContent>
          </Card>

          <div className="grid gap-4">
            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Activity className="h-4 w-4 text-primary" /> Active circles
              </div>
              <p className="tabular mt-2 text-3xl font-bold">
                <AnimatedNumber value={stats?.active_groups ?? 0} />
              </p>
            </Card>
            <Card className="p-5">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Receipt className="h-4 w-4 text-primary" /> Transactions
              </div>
              <p className="tabular mt-2 text-3xl font-bold">
                <AnimatedNumber value={stats?.transactions ?? 0} />
              </p>
            </Card>
          </div>
        </div>

        {/* Users + Groups */}
        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recent users</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-5">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {users.slice(0, 8).map((u) => (
                    <li
                      key={u.id}
                      className="flex items-center justify-between px-5 py-3"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-full bg-secondary text-xs font-semibold">
                          {initials(u.full_name)}
                        </div>
                        <div>
                          <p className="text-sm font-medium">{u.full_name}</p>
                          <p className="text-xs text-muted-foreground">
                            {u.email}
                          </p>
                        </div>
                      </div>
                      <Badge
                        variant={
                          u.role === "platform_admin" ? "chain" : "secondary"
                        }
                        className="capitalize"
                      >
                        {u.role.replace("_", " ")}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">All circles</CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {loading ? (
                <div className="space-y-3 p-5">
                  {[0, 1, 2].map((i) => (
                    <Skeleton key={i} className="h-10 w-full" />
                  ))}
                </div>
              ) : (
                <ul className="divide-y divide-border/60">
                  {groups.slice(0, 8).map((g) => (
                    <li
                      key={g.id}
                      className="flex items-center justify-between px-5 py-3"
                    >
                      <div>
                        <p className="text-sm font-medium">{g.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {formatAmount(g.contribution_amount, g.currency)} /{" "}
                          {g.frequency}
                        </p>
                      </div>
                      <Badge
                        variant={g.status === "active" ? "success" : "secondary"}
                        className="capitalize"
                      >
                        {g.status}
                      </Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Audit logs */}
        <Card>
          <CardHeader className="flex-row items-center gap-2">
            <ScrollText className="h-4 w-4 text-primary" />
            <CardTitle className="text-base">Audit log</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <div className="space-y-3 p-5">
                {[0, 1, 2].map((i) => (
                  <Skeleton key={i} className="h-8 w-full" />
                ))}
              </div>
            ) : logs.length === 0 ? (
              <p className="p-6 text-center text-sm text-muted-foreground">
                No audit entries yet.
              </p>
            ) : (
              <ul className="divide-y divide-border/60">
                {logs.slice(0, 20).map((log) => (
                  <li key={log.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs text-primary">
                          {log.action}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {log.entity_type}
                          {log.entity_id ? ` · ${log.entity_id.slice(0, 8)}` : ""}
                        </span>
                      </div>
                      <span className="text-xs text-muted-foreground">
                        {formatDate(log.created_at)}
                      </span>
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
