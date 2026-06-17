"use client";

import { motion } from "framer-motion";

const particles = Array.from({ length: 28 }, (_, i) => ({
  id: i,
  x: `${(i * 17 + 7) % 100}%`,
  y: `${(i * 23 + 11) % 100}%`,
  size: 1 + (i % 3),
  delay: (i % 8) * 0.4,
  duration: 4 + (i % 5),
}));

export function GlowBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden bg-background">
      {/* Light: airy mint wash · Dark: deep space */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,hsl(var(--primary)/0.12)_0%,transparent_55%)] dark:bg-[radial-gradient(ellipse_80%_60%_at_50%_-10%,#0a1628_0%,#020617_55%,#030712_100%)]" />

      {/* Animated gradient mesh */}
      <motion.div
        className="landing-mesh landing-mesh-light absolute -inset-[40%]"
        animate={{
          rotate: [0, 3, -2, 0],
          scale: [1, 1.04, 1.02, 1],
        }}
        transition={{ duration: 24, repeat: Infinity, ease: "easeInOut" }}
      />

      <motion.div
        className="landing-mesh-alt landing-mesh-light absolute -inset-[30%] opacity-30 dark:opacity-40"
        animate={{
          rotate: [0, -4, 2, 0],
          x: [0, 30, -20, 0],
        }}
        transition={{ duration: 32, repeat: Infinity, ease: "easeInOut" }}
      />

      <div className="absolute inset-0 bg-grid opacity-[0.25] mask-fade-b dark:opacity-[0.18]" />
      <div className="absolute inset-0 bg-dot opacity-[0.2] dark:opacity-[0.12]" />

      <div className="absolute left-1/2 top-[18%] h-[600px] w-[600px] -translate-x-1/2">
        <motion.div
          className="absolute inset-0 rounded-full border border-primary/15 dark:border-cyan-500/10"
          animate={{ rotate: 360 }}
          transition={{ duration: 60, repeat: Infinity, ease: "linear" }}
        />
        <motion.div
          className="absolute inset-8 rounded-full border border-primary/10 dark:border-teal-400/8"
          animate={{ rotate: -360 }}
          transition={{ duration: 45, repeat: Infinity, ease: "linear" }}
        />
        <div className="absolute inset-0 rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.1)_0%,transparent_65%)] blur-3xl dark:bg-[radial-gradient(circle,hsl(174_80%_50%/0.12)_0%,transparent_65%)]" />
      </div>

      <motion.div
        className="absolute -left-[10%] top-[30%] h-[420px] w-[420px] rounded-full bg-[radial-gradient(circle,hsl(var(--primary)/0.12),transparent_70%)] blur-3xl dark:bg-[radial-gradient(circle,hsl(174_80%_45%/0.18),transparent_70%)]"
        animate={{ x: [0, 40, 0], y: [0, -30, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-[5%] top-[50%] h-[380px] w-[380px] rounded-full bg-[radial-gradient(circle,hsl(var(--brand-3)/0.12),transparent_70%)] blur-3xl dark:bg-[radial-gradient(circle,hsl(190_90%_50%/0.14),transparent_70%)]"
        animate={{ x: [0, -35, 0], y: [0, 25, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute bottom-[5%] left-[30%] h-[300px] w-[500px] rounded-full bg-[radial-gradient(circle,hsl(var(--success)/0.08),transparent_70%)] blur-3xl dark:bg-[radial-gradient(circle,hsl(152_70%_40%/0.1),transparent_70%)]"
        animate={{ opacity: [0.5, 0.9, 0.5] }}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />

      {particles.map((p) => (
        <motion.span
          key={p.id}
          className="absolute rounded-full bg-primary/35 dark:bg-cyan-400/40"
          style={{
            left: p.x,
            top: p.y,
            width: p.size,
            height: p.size,
          }}
          animate={{
            y: [0, -18, 0],
            opacity: [0.2, 0.7, 0.2],
          }}
          transition={{
            duration: p.duration,
            repeat: Infinity,
            delay: p.delay,
            ease: "easeInOut",
          }}
        />
      ))}

      <div className="absolute inset-x-0 bottom-0 h-48 bg-gradient-to-t from-background to-transparent" />
    </div>
  );
}
