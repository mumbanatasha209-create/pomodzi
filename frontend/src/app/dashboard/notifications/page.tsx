"use client";

import { useEffect, useState } from "react";
import { Bell, Check } from "lucide-react";
import { AppShell } from "@/components/layout/app-shell";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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

  async function markRead(id: string) {
    setItems((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n)),
    );
    try {
      await api.readNotification(id);
    } catch {
      load();
    }
  }

  return (
    <AppShell>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold">Notifications</h1>
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading…</p>
        ) : items.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center p-8 text-center">
              <Bell className="h-8 w-8 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                You are all caught up.
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {items.map((n) => (
              <Card
                key={n.id}
                className={cn(!n.is_read && "border-primary/40 bg-primary/5")}
              >
                <CardContent className="flex items-start justify-between gap-3 p-4">
                  <div>
                    <p className="text-sm font-medium">{n.title}</p>
                    <p className="text-sm text-muted-foreground">{n.message}</p>
                    <p className="mt-1 text-xs text-muted-foreground">
                      {formatDate(n.created_at)}
                    </p>
                  </div>
                  {!n.is_read ? (
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => markRead(n.id)}
                    >
                      <Check className="h-4 w-4" />
                    </Button>
                  ) : null}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AppShell>
  );
}
