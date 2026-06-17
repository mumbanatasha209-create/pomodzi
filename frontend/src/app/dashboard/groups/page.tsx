"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import { KeyRound, Loader2, Plus, Users } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { GroupCard } from "@/components/groups/group-card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { Stagger, staggerItem } from "@/components/shared/reveal";
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
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Savings circles
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Savings circles, chamas, stokvels, cooperatives, and community groups —
              contribute, rotate, grow together.
            </p>
          </div>
          <Link href="/dashboard/groups/new">
            <Button size="sm">
              <Plus className="h-4 w-4" /> Create circle
            </Button>
          </Link>
        </div>

        {/* Join card */}
        <Card className="overflow-hidden">
          <CardContent className="p-5">
            <div className="flex items-center gap-2 text-sm font-medium">
              <KeyRound className="h-4 w-4 text-primary" />
              Join with an invite code
            </div>
            <form
              onSubmit={handleJoin}
              className="mt-3 flex flex-col gap-2 sm:flex-row"
            >
              <Input
                placeholder="e.g. PAM-3F9A2B"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                className="font-mono uppercase"
                required
              />
              <Button type="submit" variant="secondary" disabled={joining}>
                {joining ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" /> Joining…
                  </>
                ) : (
                  "Join circle"
                )}
              </Button>
            </form>
            {joinError ? (
              <p className="mt-2 text-sm text-destructive">{joinError}</p>
            ) : null}
          </CardContent>
        </Card>

        {loading ? (
          <div className="grid gap-3 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Card key={i} className="p-5">
                <div className="flex items-center gap-3">
                  <Skeleton className="h-10 w-10 rounded-xl" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-28" />
                    <Skeleton className="mt-2 h-3 w-20" />
                  </div>
                </div>
                <Skeleton className="mt-4 h-10 w-full" />
              </Card>
            ))}
          </div>
        ) : groups.length === 0 ? (
          <EmptyState
            icon={Users}
            title="No circles yet"
            description="Create your first savings circle or join an existing one with an invite code above."
            action={
              <Link href="/dashboard/groups/new">
                <Button>
                  <Plus className="h-4 w-4" /> Create a circle
                </Button>
              </Link>
            }
          />
        ) : (
          <Stagger className="grid gap-3 sm:grid-cols-2">
            {groups.map((g) => (
              <motion.div key={g.id} variants={staggerItem}>
                <GroupCard group={g} />
              </motion.div>
            ))}
          </Stagger>
        )}
      </div>
    </AppShell>
  );
}
