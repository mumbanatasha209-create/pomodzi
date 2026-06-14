"use client";

import { motion, type Variants } from "framer-motion";
import { fadeUp, staggerContainer, staggerItem, inView } from "@/lib/motion";

/** Section that reveals on scroll. */
export function Reveal({
  children,
  className,
  variants = fadeUp,
  delay = 0,
}: {
  children: React.ReactNode;
  className?: string;
  variants?: Variants;
  delay?: number;
}) {
  return (
    <motion.div
      className={className}
      variants={variants}
      initial="hidden"
      whileInView="show"
      viewport={inView}
      transition={{ delay }}
    >
      {children}
    </motion.div>
  );
}

/** Wrapper that staggers children entrance (children must use `staggerItem`). */
export function Stagger({
  children,
  className,
  stagger = 0.08,
  delay = 0,
  scroll = false,
}: {
  children: React.ReactNode;
  className?: string;
  stagger?: number;
  delay?: number;
  scroll?: boolean;
}) {
  return (
    <motion.div
      className={className}
      variants={staggerContainer(stagger, delay)}
      initial="hidden"
      {...(scroll
        ? { whileInView: "show", viewport: inView }
        : { animate: "show" })}
    >
      {children}
    </motion.div>
  );
}

export { staggerItem };
