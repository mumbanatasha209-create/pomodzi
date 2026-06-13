"use client";

import { useCallback, useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Copy, Trophy, UserPlus } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { MemberList } from "@/components/groups/member-list";
import { ContributionPanel } from "@/components/groups/contribution-panel";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
      setActionMsg("Invite code copied.");
    }
  }

  if (loading) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Loading group…</p>
      </AppShell>
    );
  }

  if (!group || !detail) {
    return (
      <AppShell>
        <p className="text-sm text-muted-foreground">Group not found.</p>
      </AppShell>
    );
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <Link
          href="/dashboard/groups"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Back to groups
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{group.name}</h1>
            {group.description ? (
              <p className="text-sm text-muted-foreground">{group.description}</p>
            ) : null}
          </div>
          <Badge variant={group.status === "active" ? "success" : "secondary"} className="capitalize">
            {group.status}
          </Badge>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Contribution</p>
              <p className="font-semibold">
                {formatAmount(group.contribution_amount, group.currency)}
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Frequency</p>
              <p className="font-semibold capitalize">{group.frequency}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Cycle</p>
              <p className="font-semibold">#{group.current_cycle}</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4">
              <p className="text-xs text-muted-foreground">Members</p>
              <p className="font-semibold">{detail.total_members}</p>
            </CardContent>
          </Card>
        </div>

        {detail.all_paid ? (
          <Card className="border-emerald-200 bg-emerald-50">
            <CardContent className="p-4 text-sm text-emerald-800">
              All members have paid for cycle {group.current_cycle}. Payout will process automatically.
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardContent className="flex flex-wrap items-center justify-between gap-3 p-4">
            <div>
              <p className="text-xs text-muted-foreground">Invite code</p>
              <p className="font-mono font-semibold">{group.invite_code}</p>
            </div>
            <Button variant="outline" size="sm" onClick={copyInvite}>
              <Copy className="h-4 w-4" /> Copy
            </Button>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Contributions</CardTitle>
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
              <CardHeader className="flex-row items-center justify-between">
                <CardTitle className="text-base">Members & rotation</CardTitle>
              </CardHeader>
              <CardContent>
                <MemberList members={detail.members} adminId={group.admin_id} />
                {isAdmin ? (
                  <form onSubmit={handleAddMember} className="mt-4 flex flex-col gap-2 sm:flex-row">
                    <Input
                      type="email"
                      placeholder="Add member by email"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      required
                    />
                    <Button type="submit" variant="outline">
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
                <CardTitle className="text-base">Payouts</CardTitle>
              </CardHeader>
              <CardContent>
                {payouts.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No payouts yet.</p>
                ) : (
                  <ul className="divide-y">
                    {payouts.map((p) => (
                      <li key={p.id} className="flex items-center justify-between py-2.5 text-sm">
                        <div className="flex items-center gap-2">
                          <Trophy className="h-4 w-4 text-primary" />
                          <div>
                            <p className="font-medium">
                              {p.recipient_name ?? "Recipient"}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              Cycle {p.cycle} · {formatDate(p.created_at)}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">
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
                      </li>
                    ))}
                  </ul>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </AppShell>
  );
}
