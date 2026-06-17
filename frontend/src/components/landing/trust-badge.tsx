"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type TrustBadgeProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  delay?: number;
};

export function TrustBadge({
  icon: Icon,
  title,
  description,
  className,
  delay = 0,
}: TrustBadgeProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay }}
      className={cn(
        "landing-glass group relative overflow-hidden rounded-2xl p-5",
        "transition-colors hover:border-primary/25 hover:bg-card/60",
        "dark:hover:border-cyan-400/25 dark:hover:bg-white/[0.07]",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-primary/10 opacity-0 blur-2xl transition-opacity group-hover:opacity-100 dark:bg-cyan-400/10" />
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-border/60 bg-gradient-to-br from-primary/15 to-accent/10 text-primary dark:border-white/10 dark:from-cyan-500/20 dark:to-emerald-500/10 dark:text-cyan-300">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold text-foreground">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{description}</p>
    </motion.div>
  );
}
