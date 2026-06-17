"use client";

import { motion } from "framer-motion";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type FeatureCardProps = {
  icon: LucideIcon;
  title: string;
  description: string;
  className?: string;
  index?: number;
};

export function FeatureCard({
  icon: Icon,
  title,
  description,
  className,
  index = 0,
}: FeatureCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 28, rotateX: 8 }}
      whileInView={{ opacity: 1, y: 0, rotateX: 0 }}
      viewport={{ once: true, amount: 0.3 }}
      transition={{ duration: 0.55, delay: index * 0.08, ease: [0.22, 1, 0.36, 1] }}
      whileHover={{ y: -6, transition: { duration: 0.25 } }}
      className={cn("landing-perspective group", className)}
    >
      <div
        className={cn(
          "landing-glass landing-card-3d relative h-full overflow-hidden rounded-2xl p-6",
          "transition-all duration-300 group-hover:border-primary/30 group-hover:shadow-[0_20px_60px_-20px_hsl(var(--primary)/0.2)]",
          "dark:group-hover:border-cyan-400/30 dark:group-hover:shadow-[0_20px_60px_-20px_hsl(174_80%_50%/0.25)]",
        )}
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-accent/5 opacity-0 transition-opacity group-hover:opacity-100" />
        <div className="relative flex h-12 w-12 items-center justify-center rounded-2xl border border-border/60 bg-gradient-to-br from-primary/15 to-accent/10 text-primary shadow-[0_0_30px_-10px_hsl(var(--primary)/0.35)] dark:border-white/10 dark:from-cyan-500/20 dark:to-teal-500/10 dark:text-cyan-300">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="relative mt-5 text-lg font-semibold text-foreground">{title}</h3>
        <p className="relative mt-2 text-sm leading-relaxed text-muted-foreground">{description}</p>
      </div>
    </motion.div>
  );
}
