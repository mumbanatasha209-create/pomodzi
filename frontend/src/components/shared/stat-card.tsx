"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { Card } from "@/components/ui/card";
import { AnimatedNumber } from "@/components/ui/animated-number";
import { Sparkline, type Point } from "@/components/ui/charts";
import { staggerItem } from "@/lib/motion";
import { cn } from "@/lib/utils";

export function StatCard({
  label,
  value,
  decimals = 0,
  prefix = "",
  suffix = "",
  icon: Icon,
  trend,
  series,
  color = "hsl(var(--chart-1))",
}: {
  label: string;
  value: number;
  decimals?: number;
  prefix?: string;
  suffix?: string;
  icon: LucideIcon;
  trend?: number;
  series?: Point[];
  color?: string;
}) {
  const positive = (trend ?? 0) >= 0;
  return (
    <motion.div variants={staggerItem}>
      <Card hover className="group relative overflow-hidden p-5">
        <div className="flex items-start justify-between">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-secondary/50 text-primary">
            <Icon className="h-5 w-5" />
          </div>
          {trend !== undefined ? (
            <span
              className={cn(
                "inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium",
                positive
                  ? "bg-[hsl(var(--success)/0.14)] text-[hsl(var(--success))]"
                  : "bg-destructive/14 text-destructive",
              )}
            >
              {positive ? (
                <ArrowUpRight className="h-3 w-3" />
              ) : (
                <ArrowDownRight className="h-3 w-3" />
              )}
              {Math.abs(trend)}%
            </span>
          ) : null}
        </div>

        <p className="mt-4 text-sm text-muted-foreground">{label}</p>
        <p className="tabular mt-1 text-2xl font-bold tracking-tight">
          <AnimatedNumber
            value={value}
            decimals={decimals}
            prefix={prefix}
            suffix={suffix}
          />
        </p>

        {series ? (
          <div className="-mx-1 mt-3 opacity-80 transition-opacity group-hover:opacity-100">
            <Sparkline data={series} color={color} height={40} />
          </div>
        ) : null}
      </Card>
    </motion.div>
  );
}
