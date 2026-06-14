"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle2,
  Copy,
  Trophy,
  UserPlus,
  Users,
} from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { MemberList } from "@/components/groups/member-list";
import { ContributionPanel } from "@/components/groups/contribution-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { ProgressRing } from "@/components/shared/progress-ring";
import { EmptyState } from "@/components/shared/empty-state";
import { api, ApiError } from "@/lib/api";
import { formatAmount, formatDate } from "@/lib/utils";
import type { Contribution, GroupDetailResponse, Payout } from "@/lib/types";

export default function GroupDetailPage() {
  const params = useParams<{ id: string }>();
  const id = params.id;

  const [detail, setDetail] = useState<GroupDetailResponse | null>(null);
  const [contributions, setContributions] = useState<Contribution[]>([]);
  const [payouts, setPayouts] = useState<Payout[]>([]);
  const [loading, setLoading] = useState(true);
  const [inviteEmail, setInviteEmail] = useState("");
  const [actionMsg, setActionMsg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const load = useCallback(async () => {
    const [g, c, p] = await Promise.allSettled([
      api.getGroup(id),
      api.groupContributions(id),
      api.groupPayouts(id),
    ]);
    if (g.status === "fulfilled") setDetail(g.value);
    if (c.status === "fulfilled") setContributions(c.value);
    if (p.status === "fulfilled") setPayouts(p.value);
    setLoading(false);
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  const group = detail?.group;
  const isAdmin = detail?.is_admin ?? false;

  async function handleAddMember(e: React.FormEvent) {
    e.preventDefault();
    setActionMsg(null);
    try {
      await api.addMember(id, { email: inviteEmail.trim() });
      setInviteEmail("");
      setActionMsg("Member added.");
      await load();
    } catch (err) {
      setActionMsg(err instanceof ApiError ? err.message : "Failed to add member");
    }
  }

  function copyInvite() {
    if (group?.invite_code) {
      void navigator.clipboard?.writeText(group.invite_code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    }
  }

  if (loading) {
    return (
      <AppShell>
        <div className="space-y-6">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-28 w-full rounded-2xl" />
          <div className="grid gap-4 lg:grid-cols-2">
            <Skeleton className="h-72 w-full rounded-2xl" />
            <Skeleton className="h-72 w-full rounded-2xl" />
          </div>
        </div>
      </AppShell>
    );
  }

  if (!group || !detail) {
    return (
      <AppShell>
        <EmptyState
          icon={Users}
          title="Group not found"
          description="This circle may have been removed or you don't have access."
          action={
            <Link href="/dashboard/groups">
              <Button>Back to circles</Button>
            </Link>
          }
        />
      </AppShell>
    );
  }

  const progress =
    detail.total_members > 0 ? detail.paid_count / detail.total_members : 0;

  return (
    <AppShell>
      <div className="space-y-6">
        <Link
          href="/dashboard/groups"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground transition-colors hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to circles
        </Link>

        {/* Hero */}
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
        >
          <Card className="relative overflow-hidden">
            <div className="absolute inset-0 -z-0 bg-radial-fade opacity-60" />
            <div className="relative flex flex-col gap-6 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-4">
                <div className="flex h-14 w-14 items-center justify-center rounded-2xl brand-gradient text-xl font-bold text-primary-foreground shadow-glow">
                  {group.name.slice(0, 1).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h1 className="text-2xl font-bold tracking-tight">
                      {group.name}
                    </h1>
                    <Badge
                      variant={group.status === "active" ? "success" : "secondary"}
                      dot
                      className="capitalize"
                    >
                      {group.status}
                    </Badge>
                  </div>
                  {group.description ? (
                    <p className="mt-1 max-w-md text-sm text-muted-foreground">
                      {group.description}
                    </p>
                  ) : null}
                </div>
              </div>

              {/* Cycle progress ring */}
              <div className="flex items-center gap-4">
                <ProgressRing value={progress} size={104} stroke={9}>
                  <span className="tabular text-xl font-bold">
                    {detail.paid_count}/{detail.total_members}
                  </span>
                  <span className="text-[10px] text-muted-foreground">paid</span>
                </ProgressRing>
                <div className="text-sm">
                  <p className="text-xs text-muted-foreground">Cycle</p>
                  <p className="text-lg font-bold">#{group.current_cycle}</p>
                  <p className="mt-1 text-xs capitalize text-muted-foreground">
                    {group.frequency}
                  </p>
                </div>
              </div>
            </div>

            {detail.all_paid ? (
              <div className="relative border-t border-[hsl(var(--success)/0.3)] bg-[hsl(var(--success)/0.08)] px-6 py-3">
                <p className="flex items-center gap-2 text-sm font-medium text-[hsl(var(--success))]">
                  <CheckCircle2 className="h-4 w-4" />
                  All members paid for cycle {group.current_cycle} — payout
                  processes automatically.
                </p>
              </div>
            ) : null}
          </Card>
        </motion.div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            {
              label: "Contribution",
              value: formatAmount(group.contribution_amount, group.currency),
            },
            { label: "Members", value: String(detail.total_members) },
            { label: "Paid this cycle", value: `${detail.paid_count}` },
            { label: "Payouts done", value: String(payouts.length) },
          ].map((s) => (
            <Card key={s.label} className="p-4">
              <p className="text-xs text-muted-foreground">{s.label}</p>
              <p className="tabular mt-1 font-semibold">{s.value}</p>
            </Card>
          ))}
        </div>

        {/* Invite code */}
        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs text-muted-foreground">Invite code</p>
              <p className="font-mono text-lg font-semibold tracking-wider">
                {group.invite_code}
              </p>
            </div>
            <Button variant="secondary" size="sm" onClick={copyInvite}>
              <Copy className="h-4 w-4" /> {copied ? "Copied" : "Copy code"}
            </Button>
          </CardContent>
        </Card>

        {/* Contribution + members/payouts */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contribution flow</CardTitle>
            </CardHeader>
            <CardContent>
              <ContributionPanel
                group={group}
                contributions={contributions}
                onContributed={load}
              />
            </CardContent>
          </Card>

          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Members &amp; rotation</CardTitle>
              </CardHeader>
              <CardContent>
                <MemberList members={detail.members} adminId={group.admin_id} />
                {isAdmin ? (
                  <form
                    onSubmit={handleAddMember}
                    className="mt-4 flex flex-col gap-2 sm:flex-row"
                  >
                    <Input
                      type="email"
                      placeholder="Add member by email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                    <Button type="submit" variant="secondary">
                      <UserPlus className="h-4 w-4" /> Add
                    </Button>
                  </form>
                ) : null}
                {actionMsg ? (
                  <p className="mt-2 text-sm text-muted-foreground">{actionMsg}</p>
                ) : null}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Payout timeline</CardTitle>
              </CardHeader>
              <CardContent>
                {payouts.length === 0 ? (
                  <p className="rounded-lg border border-dashed border-border/70 py-6 text-center text-sm text-muted-foreground">
                    No payouts yet. The first runs when everyone pays in.
                  </p>
                ) : (
                  <ol className="relative space-y-4 pl-6">
                    <span className="absolute left-[9px] top-1 h-[calc(100%-0.5rem)] w-px bg-border" />
                    {payouts.map((p) => (
                      <li key={p.id} className="relative">
                        <span className="absolute -left-[1.35rem] top-0.5 flex h-4 w-4 items-center justify-center rounded-full brand-gradient ring-4 ring-card">
                          <Trophy className="h-2.5 w-2.5 text-primary-foreground" />
                        </span>
                        <div className="flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {p.recipient_name ?? "Recipient"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Cycle {p.cycle} · {formatDate(p.created_at)}
                            </p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className="tabular text-sm font-semibold">
                              {formatAmount(p.amount, group.currency)}
                            </span>
                            <Badge
                              variant={
                                p.status === "completed"
                                  ? "success"
                                  : p.status === "failed"
                                    ? "destructive"
                                    : "warning"
                              }
                            >
                              {p.status}
                            </Badge>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ol>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
