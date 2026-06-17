"use client";

import { motion } from "framer-motion";

type CountryNode = {
  name: string;
  code: string;
  x: number;
  y: number;
};

const countries: CountryNode[] = [
  { name: "Zambia", code: "ZM", x: 52, y: 62 },
  { name: "Kenya", code: "KE", x: 58, y: 52 },
  { name: "South Africa", code: "ZA", x: 54, y: 72 },
  { name: "Nigeria", code: "NG", x: 48, y: 48 },
  { name: "UK", code: "UK", x: 46, y: 28 },
  { name: "USA", code: "US", x: 22, y: 35 },
];

const connections: [number, number][] = [
  [0, 1],
  [1, 2],
  [0, 3],
  [3, 4],
  [4, 5],
  [1, 4],
  [2, 5],
];

export function GlobalNetwork() {
  return (
    <div className="relative mx-auto aspect-[16/9] max-w-4xl overflow-hidden rounded-3xl border border-white/10 bg-white/[0.03] backdrop-blur-xl">
      {/* Grid world */}
      <div className="absolute inset-0 bg-grid opacity-20" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,hsl(174_80%_50%/0.08)_0%,transparent_70%)]" />

      <svg
        viewBox="0 0 100 60"
        className="absolute inset-0 h-full w-full"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* Stylized latitude lines */}
        {[20, 30, 40, 50].map((y) => (
          <motion.line
            key={y}
            x1="5"
            y1={y}
            x2="95"
            y2={y}
            stroke="hsl(174 60% 50% / 0.08)"
            strokeWidth="0.15"
            initial={{ pathLength: 0, opacity: 0 }}
            whileInView={{ pathLength: 1, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1.2, delay: y * 0.01 }}
          />
        ))}

        {/* Connection lines */}
        {connections.map(([a, b], i) => {
          const from = countries[a];
          const to = countries[b];
          return (
            <g key={`${a}-${b}`}>
              <line
                x1={from.x}
                y1={from.y}
                x2={to.x}
                y2={to.y}
                stroke="hsl(174 80% 55% / 0.15)"
                strokeWidth="0.2"
              />
              <motion.circle
                r="0.4"
                fill="hsl(174 80% 60%)"
                initial={{ opacity: 0 }}
                animate={{
                  cx: [from.x, to.x],
                  cy: [from.y, to.y],
                  opacity: [0, 1, 0],
                }}
                transition={{
                  duration: 3,
                  repeat: Infinity,
                  delay: i * 0.5,
                  ease: "easeInOut",
                }}
              />
            </g>
          );
        })}
      </svg>

      {/* Country nodes */}
      {countries.map((country, i) => (
        <motion.div
          key={country.code}
          className="absolute -translate-x-1/2 -translate-y-1/2"
          style={{ left: `${country.x}%`, top: `${country.y}%` }}
          initial={{ opacity: 0, scale: 0 }}
          whileInView={{ opacity: 1, scale: 1 }}
          viewport={{ once: true }}
          transition={{ duration: 0.4, delay: 0.2 + i * 0.1 }}
        >
          <motion.div
            animate={{ scale: [1, 1.15, 1] }}
            transition={{ duration: 3, repeat: Infinity, delay: i * 0.4 }}
            className="relative"
          >
            <span className="absolute -inset-3 rounded-full bg-cyan-400/20 blur-md" />
            <div className="relative flex flex-col items-center">
              <div className="flex h-8 w-8 items-center justify-center rounded-full border border-cyan-400/40 bg-[#050816]/90 text-[10px] font-bold text-cyan-300 shadow-[0_0_20px_-4px_hsl(174_80%_50%/0.6)] sm:h-10 sm:w-10 sm:text-xs">
                {country.code}
              </div>
              <span className="mt-1 whitespace-nowrap rounded-md border border-white/10 bg-black/40 px-1.5 py-0.5 text-[9px] text-slate-300 backdrop-blur sm:text-[10px]">
                {country.name}
              </span>
            </div>
          </motion.div>
        </motion.div>
      ))}

      {/* Center hub */}
      <motion.div
        className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2"
        animate={{ rotate: 360 }}
        transition={{ duration: 40, repeat: Infinity, ease: "linear" }}
      >
        <div className="h-16 w-16 rounded-full border border-dashed border-cyan-400/20 sm:h-20 sm:w-20" />
      </motion.div>
      <div className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2">
        <div className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-center backdrop-blur-xl">
          <p className="text-[10px] uppercase tracking-wider text-slate-500">Pamodzi</p>
          <p className="text-xs font-semibold text-white sm:text-sm">Global Circles</p>
        </div>
      </div>
    </div>
  );
}
