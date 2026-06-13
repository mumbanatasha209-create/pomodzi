import { Crown, Check } from "lucide-react";
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

  const ordered = [...members].sort(
    (a, b) => a.rotation_order - b.rotation_order,
  );

  return (
    <ul className="divide-y">
      {ordered.map((m) => (
        <li key={m.user_id} className="flex items-center gap-3 py-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
            {initials(m.full_name ?? m.email ?? "?")}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium">
              {m.full_name ?? m.email}
            </p>
            <p className="text-xs text-muted-foreground">
              Rotation #{m.rotation_order}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {m.user_id === adminId ? (
              <Badge variant="secondary" className="gap-1">
                <Crown className="h-3 w-3" /> Admin
              </Badge>
            ) : null}
            {m.has_received_payout ? (
              <Badge variant="success" className="gap-1">
                <Check className="h-3 w-3" /> Paid out
              </Badge>
            ) : (
              <Badge variant={m.contribution_status === "paid" ? "success" : "warning"}>
                {m.contribution_status}
              </Badge>
            )}
          </div>
        </li>
      ))}
    </ul>
  );
}
