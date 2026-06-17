"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

type PremiumButtonProps = {
  href?: string;
  children: React.ReactNode;
  variant?: "primary" | "glass" | "outline";
  size?: "default" | "lg";
  className?: string;
  onClick?: () => void;
};

const variants = {
  primary:
    "brand-gradient text-primary-foreground shadow-[0_0_40px_-8px_hsl(var(--primary)/0.45)] hover:shadow-[0_0_50px_-6px_hsl(var(--primary)/0.55)]",
  glass:
    "border border-border/60 bg-card/50 text-foreground backdrop-blur-xl hover:bg-card/80 dark:border-white/10 dark:bg-white/5 dark:text-white dark:hover:bg-white/10 dark:hover:border-white/20",
  outline:
    "border border-border bg-transparent text-foreground hover:bg-secondary/60 hover:border-primary/30 dark:border-white/15 dark:text-slate-200 dark:hover:bg-white/5 dark:hover:border-cyan-400/30",
};

const sizes = {
  default: "h-11 px-6 text-sm",
  lg: "h-14 px-8 text-[15px]",
};

export function PremiumButton({
  href,
  children,
  variant = "primary",
  size = "default",
  className,
  onClick,
}: PremiumButtonProps) {
  const classes = cn(
    "relative inline-flex items-center justify-center gap-2 rounded-xl font-semibold transition-colors",
    variants[variant],
    sizes[size],
    className,
  );

  const motionProps = {
    whileHover: { scale: 1.03, y: -1 },
    whileTap: { scale: 0.98 },
    transition: { type: "spring" as const, stiffness: 400, damping: 22 },
  };

  if (href) {
    return (
      <motion.div {...motionProps} className="inline-block">
        <Link href={href} className={classes}>
          {children}
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.button type="button" onClick={onClick} className={classes} {...motionProps}>
      {children}
    </motion.button>
  );
}
