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
        "group relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.04] p-5 backdrop-blur-xl",
        "transition-colors hover:border-cyan-400/25 hover:bg-white/[0.07]",
        className,
      )}
    >
      <div className="pointer-events-none absolute -right-6 -top-6 h-24 w-24 rounded-full bg-cyan-400/10 blur-2xl transition-opacity group-hover:opacity-100 opacity-0" />
      <div className="flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-gradient-to-br from-cyan-500/20 to-emerald-500/10 text-cyan-300">
        <Icon className="h-5 w-5" />
      </div>
      <h3 className="mt-4 font-semibold text-white">{title}</h3>
      <p className="mt-1.5 text-sm leading-relaxed text-slate-400">{description}</p>
    </motion.div>
  );
}
