"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { GroupCard } from "@/components/groups/group-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { api, ApiError } from "@/lib/api";
import type { SavingsGroup } from "@/lib/types";

export default function GroupsPage() {
  const [groups, setGroups] = useState<SavingsGroup[]>([]);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState("");
  const [joinError, setJoinError] = useState<string | null>(null);
  const [joining, setJoining] = useState(false);

  async function load() {
    try {
      setGroups(await api.listGroups());
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function handleJoin(e: React.FormEvent) {
    e.preventDefault();
    setJoinError(null);
    setJoining(true);
    try {
      await api.joinGroup({ invite_code: code.trim() });
      setCode("");
      await load();
    } catch (err) {
      setJoinError(err instanceof ApiError ? err.message : "Could not join group");
    } finally {
      setJoining(false);
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold">Savings groups</h1>
          <Link href="/dashboard/groups/new">
            <Button size="sm">
              <Plus className="h-4 w-4" /> Create
            </Button>
          </Link>
        </div>

        <Card>
          <CardContent className="p-4">
            <form onSubmit={handleJoin} className="flex flex-col gap-2 sm:flex-row">
              <Input
                placeholder="Enter invite code to join a group"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
              <Button type="submit" variant="outline" disabled={joining}>
                {joining ? "Joining…" : "Join"}
              </Button>
            </form>
            {joinError ? (
              <p className="mt-2 text-sm text-destructive">{joinError}</p>
            ) : null}
          </CardContent>
        </Card>

        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : groups.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center p-8 text-center">
              <Users className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                No groups yet. Create one or join with an invite code.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            {groups.map((g) => (
              <GroupCard key={g.id} group={g} />
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
