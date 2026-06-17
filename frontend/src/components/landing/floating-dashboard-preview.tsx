"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import {
  ArrowRight,
  CheckCircle2,
  Circle,
  Radio,
  Wallet,
  Users,
  Vault,
} from "lucide-react";
import { AnimatedCounter } from "./animated-counter";
import { cn } from "@/lib/utils";

const members = [
  { name: "Alice", paid: true },
  { name: "Bob", paid: true },
  { name: "Carol", paid: true },
  { name: "David", paid: false },
  { name: "Eve", paid: false },
];

function FlowArrow({ delay = 0 }: { delay?: number }) {
  return (
    <motion.div
      className="relative flex items-center justify-center px-1"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay }}
    >
      <motion.div
        className="h-px w-8 bg-gradient-to-r from-primary/20 via-primary/50 to-primary/20 sm:w-12 dark:from-cyan-500/20 dark:via-cyan-400/60 dark:to-cyan-500/20"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, delay }}
      />
      <motion.div
        className="absolute h-1.5 w-1.5 rounded-full bg-primary shadow-[0_0_8px_2px_hsl(var(--primary)/0.6)] dark:bg-cyan-400 dark:shadow-[0_0_8px_2px_hsl(174_80%_55%/0.8)]"
        animate={{ x: [-16, 16], opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay, ease: "easeInOut" }}
      />
      <ArrowRight className="absolute h-3 w-3 text-primary/70 dark:text-cyan-400/70" />
    </motion.div>
  );
}

/** Fixed offsets avoid Framer Motion x/y hydration rounding mismatches. */
function orbitOffset(angle: number, radius: number) {
  const rad = (angle * Math.PI) / 180;
  const x = Math.cos(rad) * radius - 20;
  const y = Math.sin(rad) * radius - 20;
  return {
    x: Number(x.toFixed(2)),
    y: Number(y.toFixed(2)),
  };
}

const ORBITAL_NODES = [
  { angle: 0, label: "Node", delay: 0 },
  { angle: 72, label: "XLM", delay: 0.5 },
  { angle: 144, label: "TX", delay: 1 },
  { angle: 216, label: "ZK", delay: 1.5 },
  { angle: 288, label: "GB", delay: 2 },
] as const;

function OrbitalNode({
  angle,
  radius,
  label,
  delay,
  animate,
}: {
  angle: number;
  radius: number;
  label: string;
  delay: number;
  animate: boolean;
}) {
  const { x, y } = orbitOffset(angle, radius);

  return (
    <div
      className="absolute left-1/2 top-1/2"
      style={{ transform: `translate(${x}px, ${y}px)` }}
    >
      <motion.div
        className="flex h-10 w-10 items-center justify-center rounded-full border border-primary/30 bg-card text-[10px] font-medium text-primary backdrop-blur-sm dark:border-cyan-400/30 dark:bg-[#050816]/80 dark:text-cyan-300"
        animate={animate ? { scale: [1, 1.08, 1] } : { scale: 1 }}
        transition={{ duration: 3, repeat: Infinity, delay }}
      >
        {label.slice(0, 2)}
      </motion.div>
    </div>
  );
}

export function FloatingDashboardPreview({ className }: { className?: string }) {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  return (
    <div className={cn("relative", className)}>
      {/* Orbital network behind card */}
      <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
        <motion.div
          className="relative h-[340px] w-[340px] sm:h-[400px] sm:w-[400px]"
          animate={mounted ? { rotate: 360 } : undefined}
          transition={{ duration: 80, repeat: Infinity, ease: "linear" }}
        >
          <div className="absolute inset-0 rounded-full border border-dashed border-primary/20 dark:border-cyan-500/15" />
          <div className="absolute inset-6 rounded-full border border-primary/15 dark:border-cyan-400/10" />
          {ORBITAL_NODES.map((node) => (
            <OrbitalNode
              key={node.label}
              angle={node.angle}
              radius={150}
              label={node.label}
              delay={node.delay}
              animate={mounted}
            />
          ))}
        </motion.div>
      </div>

      {/* Glow under card */}
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-primary/15 via-accent/10 to-emerald-500/10 opacity-60 blur-3xl dark:from-cyan-500/20 dark:via-teal-500/10 dark:to-emerald-500/15" />

      {/* Main floating card */}
      <motion.div
        initial={{ opacity: 0, y: 40, rotateY: -8, rotateX: 4 }}
        animate={{ opacity: 1, y: 0, rotateY: 0, rotateX: 0 }}
        transition={{ duration: 0.9, delay: 0.2, ease: [0.22, 1, 0.36, 1] }}
        className="landing-perspective relative"
      >
        <motion.div
          animate={{ y: [0, -10, 0] }}
          transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
          className="landing-glass-strong landing-card-3d relative overflow-hidden rounded-2xl shadow-xl dark:shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] sm:rounded-3xl"
        >
          <div className="flex items-center justify-between border-b border-border/50 px-4 py-3 sm:px-5 dark:border-white/10">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
            </div>
            <span className="landing-accent-chip rounded-full px-2.5 py-0.5 text-[10px] font-medium">
              Stellar Testnet
            </span>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            <div className="flex flex-wrap items-center gap-2">
              <span className="landing-glass rounded-lg px-2.5 py-1 text-xs font-medium text-foreground">
                XLM
              </span>
              <span className="landing-glass rounded-lg px-2.5 py-1 text-xs font-medium text-muted-foreground">
                USDC
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-[hsl(var(--success))]">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[hsl(var(--success))] opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
                </span>
                Network Online
              </span>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-border/50 bg-gradient-to-br from-primary/10 via-accent/5 to-transparent p-4 dark:border-white/10 dark:from-cyan-500/15 dark:via-teal-500/10 dark:to-emerald-500/10">
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-primary/15 blur-2xl dark:bg-cyan-400/20" />
              <p className="text-xs font-medium uppercase tracking-wider text-primary/80 dark:text-cyan-300/80">
                Treasury Balance
              </p>
              <p className="tabular mt-1 text-3xl font-bold text-foreground sm:text-4xl">
                <AnimatedCounter value={15000} suffix=" XLM" />
              </p>
              <p className="mt-1 text-xs text-muted-foreground">Global Family Fund · Cycle 1</p>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="landing-glass rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Next Payout</p>
                <p className="mt-1 font-semibold text-foreground">Alice</p>
              </div>
              <div className="landing-glass rounded-xl p-3">
                <p className="text-[10px] uppercase tracking-wide text-muted-foreground">Progress</p>
                <p className="tabular mt-1 font-semibold text-foreground">
                  <AnimatedCounter value={3} />/5 paid
                </p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-border/60 dark:bg-white/10">
                  <motion.div
                    className="h-full brand-gradient"
                    initial={{ width: 0 }}
                    animate={{ width: "60%" }}
                    transition={{ duration: 1.4, delay: 0.8 }}
                  />
                </div>
              </div>
            </div>

            <div className="landing-glass flex items-center justify-between rounded-xl px-3 py-3">
              <div className="flex flex-col items-center gap-1">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-[9px] text-muted-foreground">Members</span>
              </div>
              <FlowArrow delay={0} />
              <div className="flex flex-col items-center gap-1">
                <Vault className="h-4 w-4 text-accent" />
                <span className="text-[9px] text-muted-foreground">Treasury</span>
              </div>
              <FlowArrow delay={0.6} />
              <div className="flex flex-col items-center gap-1">
                <Wallet className="h-4 w-4 text-[hsl(var(--success))]" />
                <span className="text-[9px] text-muted-foreground">Payout</span>
              </div>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex -space-x-2">
                {members.map((m) => (
                  <div
                    key={m.name}
                    title={m.name}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border-2 border-background text-[9px] font-bold",
                      m.paid
                        ? "brand-gradient text-primary-foreground"
                        : "bg-secondary text-muted-foreground",
                    )}
                  >
                    {m.paid ? (
                      <CheckCircle2 className="h-3.5 w-3.5" />
                    ) : (
                      <Circle className="h-3 w-3" />
                    )}
                  </div>
                ))}
              </div>
              <div className="min-w-0 text-right">
                <p className="text-[9px] uppercase tracking-wide text-muted-foreground">Latest Tx</p>
                <p className="truncate font-mono text-[10px] text-primary/90 dark:text-cyan-300/90">
                  0b96e7…9b9ffeb
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      </motion.div>

      {/* Floating glass accent cards */}
      <motion.div
        animate={{ y: [0, -6, 0], x: [0, 4, 0] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut", delay: 0.5 }}
        className="landing-glass absolute -left-4 top-8 hidden rounded-xl px-3 py-2 sm:block lg:-left-10"
      >
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Radio className="h-3.5 w-3.5 text-primary" />
          Live contribution
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 8, 0], x: [0, -4, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -right-2 bottom-16 hidden rounded-xl border border-[hsl(var(--success)/0.25)] bg-[hsl(var(--success)/0.1)] px-3 py-2 backdrop-blur-xl sm:block lg:-right-8"
      >
        <div className="flex items-center gap-2 text-xs text-[hsl(var(--success))]">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Payout released
        </div>
      </motion.div>
    </div>
  );
}
