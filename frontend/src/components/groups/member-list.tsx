"use client";

import { motion } from "framer-motion";
import { Check, Crown, Trophy } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { initials } from "@/lib/utils";
import type { MemberView } from "@/lib/types";

export function MemberList({
  members,
  adminId,
}: {
  members: MemberView[];
  adminId?: string;
}) {
  if (!members.length) {
    return (
      <p className="py-6 text-center text-sm text-muted-foreground">
        No members yet.
      </p>
    );
  }

  const ordered = [...members].sort((a, b) => a.rotation_order - b.rotation_order);
  const nextRecipient = ordered.find((m) => !m.has_received_payout);

  return (
    <ul className="space-y-1.5">
      {ordered.map((m, i) => {
        const isNext = nextRecipient?.user_id === m.user_id;
        return (
          <motion.li
            key={m.user_id}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.04 }}
            className="flex items-center gap-3 rounded-xl border border-transparent px-2 py-2 transition-colors hover:border-border/60 hover:bg-secondary/40"
          >
            <div className="relative">
              <div className="flex h-9 w-9 items-center justify-center rounded-full bg-secondary text-xs font-semibold text-foreground">
                {initials(m.full_name ?? m.email ?? "?")}
              </div>
              <span className="absolute -bottom-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-card text-[10px] font-bold text-muted-foreground ring-1 ring-border">
                {m.rotation_order}
              </span>
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">
                {m.full_name ?? m.email}
              </p>
              <p className="text-xs text-muted-foreground">
                {isNext && !m.has_received_payout ? (
                  <span className="text-primary">Next to receive</span>
                ) : (
                  `Rotation #${m.rotation_order}`
                )}
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              {m.user_id === adminId ? (
                <Badge variant="secondary" className="gap-1">
                  <Crown className="h-3 w-3" /> Admin
                </Badge>
              ) : null}
              {m.has_received_payout ? (
                <Badge variant="chain" className="gap-1">
                  <Trophy className="h-3 w-3" /> Paid out
                </Badge>
              ) : m.contribution_status === "paid" ? (
                <Badge variant="success" className="gap-1">
                  <Check className="h-3 w-3" /> Paid
                </Badge>
              ) : (
                <Badge variant="warning">Pending</Badge>
              )}
            </div>
          </motion.li>
        );
      })}
    </ul>
  );
}
