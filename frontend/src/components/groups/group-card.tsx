import Link from "next/link";
import { ArrowUpRight, Repeat, Users } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatAmount } from "@/lib/utils";
import type { SavingsGroup } from "@/lib/types";

const statusVariant: Record<
  SavingsGroup["status"],
  "success" | "warning" | "secondary"
> = {
  active: "success",
  paused: "warning",
  completed: "secondary",
};

export function GroupCard({ group }: { group: SavingsGroup }) {
  return (
    <Link href={`/dashboard/groups/${group.id}`} className="group block h-full">
      <Card hover className="flex h-full flex-col p-5">
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl brand-gradient text-sm font-bold text-primary-foreground">
              {group.name.slice(0, 1).toUpperCase()}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold leading-tight">
                {group.name}
              </p>
              <p className="text-xs capitalize text-muted-foreground">
                {group.frequency} · cycle {group.current_cycle}
              </p>
            </div>
          </div>
          <Badge variant={statusVariant[group.status]} dot className="capitalize">
            {group.status}
          </Badge>
        </div>

        {group.description ? (
          <p className="mt-3 line-clamp-2 text-sm text-muted-foreground">
            {group.description}
          </p>
        ) : (
          <div className="mt-3" />
        )}

        <div className="mt-auto flex items-center justify-between border-t border-border/60 pt-4 text-sm">
          <div>
            <p className="text-xs text-muted-foreground">Contribution</p>
            <p className="tabular font-semibold text-foreground">
              {formatAmount(group.contribution_amount, group.currency)}
            </p>
          </div>
          <div className="flex items-center gap-3 text-muted-foreground">
            <span className="inline-flex items-center gap-1 text-xs">
              <Users className="h-3.5 w-3.5" />
              {group.member_count ?? 0}
            </span>
            <span className="inline-flex items-center gap-1 text-xs">
              <Repeat className="h-3.5 w-3.5" />
              rotating
            </span>
            <ArrowUpRight className="h-4 w-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-primary" />
          </div>
        </div>
      </Card>
    </Link>
  );
}
