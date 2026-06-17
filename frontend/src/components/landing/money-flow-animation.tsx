"use client";

import { motion } from "framer-motion";
import {
  ArrowRight,
  Globe2,
  Users,
  Vault,
  Wallet,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

type FlowStep = {
  icon: LucideIcon;
  title: string;
  subtitle: string;
  glow: string;
};

const steps: FlowStep[] = [
  {
    icon: Users,
    title: "Members",
    subtitle: "Contribute XLM from personal wallets",
    glow: "from-cyan-500/30 to-cyan-500/5",
  },
  {
    icon: Vault,
    title: "Group Treasury",
    subtitle: "Funds pool in a dedicated circle vault",
    glow: "from-teal-500/30 to-teal-500/5",
  },
  {
    icon: Globe2,
    title: "Stellar Testnet",
    subtitle: "Settled on-chain with real transaction hashes",
    glow: "from-blue-500/30 to-cyan-500/5",
  },
  {
    icon: Wallet,
    title: "Beneficiary Wallet",
    subtitle: "Rotating payout released automatically",
    glow: "from-emerald-500/30 to-emerald-500/5",
  },
];

function Connector({ index }: { index: number }) {
  return (
    <div className="relative hidden flex-1 items-center lg:flex">
      <div className="h-px w-full bg-gradient-to-r from-border via-primary/40 to-border dark:from-white/5 dark:via-cyan-400/40 dark:to-white/5" />
      <motion.div
        className="absolute left-0 h-1 w-1 rounded-full bg-primary shadow-[0_0_10px_2px_hsl(var(--primary)/0.6)] dark:bg-cyan-400 dark:shadow-[0_0_10px_2px_hsl(174_80%_55%/0.8)]"
        animate={{ left: ["0%", "100%"], opacity: [0, 1, 0] }}
        transition={{
          duration: 2.5,
          repeat: Infinity,
          delay: index * 0.6,
          ease: "easeInOut",
        }}
      />
      <ArrowRight className="absolute right-0 h-4 w-4 text-primary/50 dark:text-cyan-400/50" />
    </div>
  );
}

function FlowCard({ step, index }: { step: FlowStep; index: number }) {
  const Icon = step.icon;
  return (
    <motion.div
      initial={{ opacity: 0, y: 24 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.4 }}
      transition={{ duration: 0.5, delay: index * 0.12 }}
      whileHover={{ y: -4 }}
      className="relative flex-1"
    >
      <div
        className={cn(
          "landing-glass relative overflow-hidden rounded-2xl p-5",
          "transition-all hover:border-primary/25 hover:shadow-[0_20px_50px_-20px_hsl(var(--primary)/0.2)]",
          "dark:hover:border-cyan-400/25 dark:hover:shadow-[0_20px_50px_-20px_hsl(174_80%_50%/0.3)]",
        )}
      >
        <div
          className={cn(
            "pointer-events-none absolute -right-4 -top-4 h-24 w-24 rounded-full bg-gradient-to-br blur-2xl",
            step.glow,
          )}
        />
        <div className="relative flex h-11 w-11 items-center justify-center rounded-xl border border-border/60 bg-secondary/50 text-primary dark:border-white/10 dark:bg-gradient-to-br dark:from-white/10 dark:to-white/5 dark:text-cyan-300">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="relative mt-4 font-semibold text-foreground">{step.title}</h3>
        <p className="relative mt-1.5 text-sm text-muted-foreground">{step.subtitle}</p>
      </div>
      {index < steps.length - 1 && (
        <div className="flex justify-center py-3 lg:hidden">
          <motion.div
            animate={{ y: [0, 4, 0] }}
            transition={{ duration: 1.5, repeat: Infinity }}
          >
            <ArrowRight className="h-5 w-5 rotate-90 text-primary/50 dark:text-cyan-400/50" />
          </motion.div>
        </div>
      )}
    </motion.div>
  );
}

export function MoneyFlowAnimation() {
  return (
    <div className="flex flex-col gap-0 lg:flex-row lg:items-stretch lg:gap-0">
      {steps.map((step, i) => (
        <div key={step.title} className="flex flex-1 flex-col lg:flex-row lg:items-center">
          <FlowCard step={step} index={i} />
          {i < steps.length - 1 && <Connector index={i} />}
        </div>
      ))}
    </div>
  );
}
