"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Bell, BellRing, Check, CheckCheck } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, formatDate } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Notification } from "@/lib/types";

export default function NotificationsPage() {
  const [items, setItems] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  function load() {
    api
      .notifications()
      .then(setItems)
      .catch(() => setItems([]))
      .finally(() => setLoading(false));
  }

  useEffect(() => {
    load();
  }, []);

  const unread = useMemo(() => items.filter((n) => !n.is_read).length, [items]);

  async function markRead(id: string) {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)));
    try {
      await api.readNotification(id);
    } catch {
      load();
    }
  }

  async function markAll() {
    const unreadItems = items.filter((n) => !n.is_read);
    setItems((prev) => prev.map((n) => ({ ...n, is_read: true })));
    await Promise.allSettled(unreadItems.map((n) => api.readNotification(n.id)));
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
                Notifications
              </h1>
              {unread > 0 ? (
                <Badge variant="default" dot>
                  {unread} new
                </Badge>
              ) : null}
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Updates from your circles, contributions and payouts.
            </p>
          </div>
          {unread > 0 ? (
            <Button variant="secondary" size="sm" onClick={markAll}>
              <CheckCheck className="h-4 w-4" /> Mark all read
            </Button>
          ) : null}
        </div>

        {loading ? (
          <div className="space-y-2">
            {[0, 1, 2].map((i) => (
              <Card key={i} className="p-4">
                <div className="flex gap-3">
                  <Skeleton className="h-9 w-9 rounded-full" />
                  <div className="flex-1">
                    <Skeleton className="h-4 w-40" />
                    <Skeleton className="mt-2 h-3 w-full" />
                  </div>
                </div>
              </Card>
            ))}
          </div>
        ) : items.length === 0 ? (
          <EmptyState
            icon={Bell}
            title="You're all caught up"
            description="New activity from your circles will appear here."
          />
        ) : (
          <div className="space-y-2">
            {items.map((n, i) => (
              <motion.div
                key={n.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: Math.min(i * 0.03, 0.3) }}
              >
                <Card
                  className={cn(
                    "transition-colors",
                    !n.is_read && "border-primary/40 bg-primary/[0.06]",
                  )}
                >
                  <div className="flex items-start justify-between gap-3 p-4">
                    <div className="flex gap-3">
                      <div
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          n.is_read
                            ? "bg-secondary text-muted-foreground"
                            : "brand-gradient text-primary-foreground",
                        )}
                      >
                        {n.is_read ? (
                          <Bell className="h-4 w-4" />
                        ) : (
                          <BellRing className="h-4 w-4" />
                        )}
                      </div>
                      <div>
                        <p className="text-sm font-semibold">{n.title}</p>
                        <p className="text-sm text-muted-foreground">{n.message}</p>
                        <p className="mt-1 text-xs text-muted-foreground/80">
                          {formatDate(n.created_at)}
                        </p>
                      </div>
                    </div>
                    {!n.is_read ? (
                      <button
                        onClick={() => markRead(n.id)}
                        aria-label="Mark read"
                        className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-secondary hover:text-primary"
                      >
                        <Check className="h-4 w-4" />
                      </button>
                    ) : null}
                  </div>
                </Card>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
