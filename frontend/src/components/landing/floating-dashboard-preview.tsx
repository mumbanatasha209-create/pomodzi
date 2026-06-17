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
        className="h-px w-8 bg-gradient-to-r from-cyan-500/20 via-cyan-400/60 to-cyan-500/20 sm:w-12"
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 2, repeat: Infinity, delay }}
      />
      <motion.div
        className="absolute h-1.5 w-1.5 rounded-full bg-cyan-400 shadow-[0_0_8px_2px_hsl(174_80%_55%/0.8)]"
        animate={{ x: [-16, 16], opacity: [0, 1, 0] }}
        transition={{ duration: 2, repeat: Infinity, delay, ease: "easeInOut" }}
      />
      <ArrowRight className="absolute h-3 w-3 text-cyan-400/70" />
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
        className="flex h-10 w-10 items-center justify-center rounded-full border border-cyan-400/30 bg-[#050816]/80 text-[10px] font-medium text-cyan-300 backdrop-blur-sm"
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
          <div className="absolute inset-0 rounded-full border border-dashed border-cyan-500/15" />
          <div className="absolute inset-6 rounded-full border border-cyan-400/10" />
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
      <div className="absolute -inset-6 rounded-[2rem] bg-gradient-to-br from-cyan-500/20 via-teal-500/10 to-emerald-500/15 opacity-60 blur-3xl" />

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
          className="landing-card-3d relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.06] shadow-[0_40px_80px_-30px_rgba(0,0,0,0.7)] backdrop-blur-2xl sm:rounded-3xl"
        >
          {/* Window chrome */}
          <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
            <div className="flex items-center gap-1.5">
              <span className="h-2.5 w-2.5 rounded-full bg-red-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-amber-400/70" />
              <span className="h-2.5 w-2.5 rounded-full bg-emerald-400/70" />
            </div>
            <span className="rounded-full border border-cyan-400/30 bg-cyan-500/10 px-2.5 py-0.5 text-[10px] font-medium text-cyan-300">
              Stellar Testnet
            </span>
          </div>

          <div className="space-y-4 p-4 sm:p-5">
            {/* Asset chips + network status */}
            <div className="flex flex-wrap items-center gap-2">
              <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-white">
                XLM
              </span>
              <span className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-xs font-medium text-slate-300">
                USDC
              </span>
              <span className="ml-auto inline-flex items-center gap-1.5 text-xs text-emerald-400">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-400" />
                </span>
                Network Online
              </span>
            </div>

            {/* Treasury hero stat */}
            <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-cyan-500/15 via-teal-500/10 to-emerald-500/10 p-4">
              <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-cyan-400/20 blur-2xl" />
              <p className="text-xs font-medium uppercase tracking-wider text-cyan-300/80">
                Treasury Balance
              </p>
              <p className="tabular mt-1 text-3xl font-bold text-white sm:text-4xl">
                <AnimatedCounter value={15000} suffix=" XLM" />
              </p>
              <p className="mt-1 text-xs text-slate-400">Global Family Fund · Cycle 1</p>
            </div>

            {/* Stats grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Next Payout</p>
                <p className="mt-1 font-semibold text-white">Alice</p>
              </div>
              <div className="rounded-xl border border-white/10 bg-white/[0.04] p-3">
                <p className="text-[10px] uppercase tracking-wide text-slate-500">Progress</p>
                <p className="tabular mt-1 font-semibold text-white">
                  <AnimatedCounter value={3} />/5 paid
                </p>
                <div className="mt-2 h-1 overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    className="h-full bg-gradient-to-r from-cyan-400 to-emerald-400"
                    initial={{ width: 0 }}
                    animate={{ width: "60%" }}
                    transition={{ duration: 1.4, delay: 0.8 }}
                  />
                </div>
              </div>
            </div>

            {/* Money flow mini diagram */}
            <div className="flex items-center justify-between rounded-xl border border-white/10 bg-white/[0.03] px-3 py-3">
              <div className="flex flex-col items-center gap-1">
                <Users className="h-4 w-4 text-cyan-400" />
                <span className="text-[9px] text-slate-500">Members</span>
              </div>
              <FlowArrow delay={0} />
              <div className="flex flex-col items-center gap-1">
                <Vault className="h-4 w-4 text-teal-400" />
                <span className="text-[9px] text-slate-500">Treasury</span>
              </div>
              <FlowArrow delay={0.6} />
              <div className="flex flex-col items-center gap-1">
                <Wallet className="h-4 w-4 text-emerald-400" />
                <span className="text-[9px] text-slate-500">Payout</span>
              </div>
            </div>

            {/* Members + tx hash */}
            <div className="flex items-center justify-between gap-3">
              <div className="flex -space-x-2">
                {members.map((m) => (
                  <div
                    key={m.name}
                    title={m.name}
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-full border-2 border-[#050816] text-[9px] font-bold",
                      m.paid
                        ? "bg-gradient-to-br from-cyan-500 to-emerald-500 text-white"
                        : "bg-white/10 text-slate-400",
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
                <p className="text-[9px] uppercase tracking-wide text-slate-500">Latest Tx</p>
                <p className="truncate font-mono text-[10px] text-cyan-300/90">
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
        className="absolute -left-4 top-8 hidden rounded-xl border border-white/10 bg-white/[0.06] px-3 py-2 backdrop-blur-xl sm:block lg:-left-10"
      >
        <div className="flex items-center gap-2 text-xs text-slate-300">
          <Radio className="h-3.5 w-3.5 text-cyan-400" />
          Live contribution
        </div>
      </motion.div>

      <motion.div
        animate={{ y: [0, 8, 0], x: [0, -4, 0] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut", delay: 1 }}
        className="absolute -right-2 bottom-16 hidden rounded-xl border border-emerald-400/20 bg-emerald-500/10 px-3 py-2 backdrop-blur-xl sm:block lg:-right-8"
      >
        <div className="flex items-center gap-2 text-xs text-emerald-300">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Payout released
        </div>
      </motion.div>
    </div>
  );
}
