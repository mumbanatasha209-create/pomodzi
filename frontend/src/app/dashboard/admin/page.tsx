"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Activity, Layers, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuth } from "@/context/auth-context";
import { api } from "@/lib/api";
import { formatAmount, formatDate } from "@/lib/utils";
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
        <p className="text-sm text-muted-foreground">
          You do not have access to this page.
        </p>
      </AppShell>
    );
  }

  const cards = [
    { label: "Users", value: stats?.users ?? 0, icon: Users },
    { label: "Groups", value: stats?.groups ?? 0, icon: Layers },
    { label: "Active groups", value: stats?.active_groups ?? 0, icon: Activity },
  ];

  return (
    <AppShell>
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Platform admin</h1>
          <p className="text-sm text-muted-foreground">
            Oversight of users, groups and activity.
          </p>
        </div>

        <div className="grid grid-cols-3 gap-3">
          {cards.map((c) => {
            const Icon = c.icon;
            return (
              <Card key={c.label}>
                <CardContent className="p-4">
                  <Icon className="h-5 w-5 text-primary" />
                  <p className="mt-2 text-2xl font-bold">{c.value}</p>
                  <p className="text-xs text-muted-foreground">{c.label}</p>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {stats ? (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Contributions paid</p>
                <p className="font-semibold">{stats.contributions_paid}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Payouts completed</p>
                <p className="font-semibold">{stats.payouts_completed}</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-4">
                <p className="text-xs text-muted-foreground">Transactions</p>
                <p className="font-semibold">{stats.transactions}</p>
              </CardContent>
            </Card>
          </div>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Users</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {loading ? (
              <p className="p-5 text-sm text-muted-foreground">Loading…</p>
            ) : (
              <ul className="divide-y">
                {users.slice(0, 12).map((u) => (
                  <li key={u.id} className="flex items-center justify-between px-5 py-3">
                    <div>
                      <p className="text-sm font-medium">{u.full_name}</p>
                      <p className="text-xs text-muted-foreground">{u.email}</p>
                    </div>
                    <Badge variant="secondary" className="capitalize">
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
            <CardTitle className="text-base">All groups</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y">
              {groups.slice(0, 12).map((g) => (
                <li key={g.id} className="flex items-center justify-between px-5 py-3">
                  <div>
                    <p className="text-sm font-medium">{g.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {formatAmount(g.contribution_amount, g.currency)} / {g.frequency}
                    </p>
                  </div>
                  <Badge variant={g.status === "active" ? "success" : "secondary"} className="capitalize">
                    {g.status}
                  </Badge>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Audit logs</CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            {logs.length === 0 ? (
              <p className="p-5 text-sm text-muted-foreground">No audit entries.</p>
            ) : (
              <ul className="divide-y">
                {logs.slice(0, 20).map((log) => (
                  <li key={log.id} className="px-5 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-medium">{log.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {formatDate(log.created_at)}
                      </p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {log.entity_type}
                      {log.entity_id ? ` · ${log.entity_id}` : ""}
                    </p>
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
