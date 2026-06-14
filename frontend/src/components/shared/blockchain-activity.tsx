"use client";

import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Activity, Globe2, ShieldCheck, Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";

/** A live-feeling Stellar network status / blockchain activity widget. */
export function BlockchainActivity({ className }: { className?: string }) {
  const [ledger, setLedger] = useState(54_239_812);
  const [tps, setTps] = useState(118);

  useEffect(() => {
    const id = setInterval(() => {
      setLedger((l) => l + Math.floor(Math.random() * 2) + 1);
      setTps(90 + Math.floor(Math.random() * 80));
    }, 4800);
    return () => clearInterval(id);
  }, []);

  return (
    <Card className={cn("overflow-hidden", className)}>
      <div className="flex items-center justify-between border-b border-border/60 px-5 py-3.5">
        <div className="flex items-center gap-2">
          <span className="live-dot relative flex h-2 w-2 rounded-full bg-[hsl(var(--success))]" />
          <span className="text-sm font-medium">Stellar Network</span>
        </div>
        <span className="inline-flex items-center gap-1 rounded-full bg-[hsl(var(--success)/0.14)] px-2 py-0.5 text-xs font-medium text-[hsl(var(--success))]">
          Operational
        </span>
      </div>
      <div className="grid grid-cols-2 divide-x divide-border/60">
        <Metric icon={Activity} label="Latest ledger">
          <motion.span
            key={ledger}
            initial={{ opacity: 0, y: -6 }}
            animate={{ opacity: 1, y: 0 }}
            className="tabular"
          >
            #{ledger.toLocaleString()}
          </motion.span>
        </Metric>
        <Metric icon={Zap} label="Throughput">
          <span className="tabular">{tps} ops/s</span>
        </Metric>
        <Metric icon={Globe2} label="Network">
          Testnet
        </Metric>
        <Metric icon={ShieldCheck} label="Finality">
          ~5 sec
        </Metric>
      </div>
    </Card>
  );
}

function Metric({
  icon: Icon,
  label,
  children,
}: {
  icon: typeof Activity;
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="px-5 py-3.5">
      <div className="mb-1 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Icon className="h-3.5 w-3.5" />
        {label}
      </div>
      <p className="text-sm font-semibold">{children}</p>
    </div>
  );
}
