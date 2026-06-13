import Link from "next/link";
import { Users } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
    <Link href={`/dashboard/groups/${group.id}`} className="block">
      <Card className="transition-shadow hover:shadow-md">
        <CardHeader className="pb-2">
          <div className="flex items-start justify-between gap-2">
            <CardTitle className="text-base">{group.name}</CardTitle>
            <Badge variant={statusVariant[group.status]} className="capitalize">
              {group.status}
            </Badge>
          </div>
          {group.description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">
              {group.description}
            </p>
          ) : null}
        </CardHeader>
        <CardContent className="flex items-center justify-between text-sm">
          <span className="font-medium text-primary">
            {formatAmount(group.contribution_amount, group.currency)}
            <span className="text-muted-foreground"> / {group.frequency}</span>
          </span>
          <span className="flex items-center gap-1 text-muted-foreground">
            <Users className="h-4 w-4" />
            {group.member_count ?? 0}
          </span>
        </CardContent>
      </Card>
    </Link>
  );
}
