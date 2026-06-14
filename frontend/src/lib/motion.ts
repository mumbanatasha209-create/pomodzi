import type { Variants, Transition } from "framer-motion";

/** Premium spring used for interactive elements. */
export const spring: Transition = {
  type: "spring",
  stiffness: 380,
  damping: 30,
  mass: 0.8,
};

export const easeOut: Transition = {
  duration: 0.5,
  ease: [0.22, 1, 0.36, 1],
};

/** Fade + rise in. */
export const fadeUp: Variants = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: easeOut },
};

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  show: { opacity: 1, transition: { duration: 0.6, ease: "easeOut" } },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  show: { opacity: 1, scale: 1, transition: easeOut },
};

/** Container that staggers its children's entrance. */
export const staggerContainer = (stagger = 0.07, delay = 0): Variants => ({
  hidden: {},
  show: {
    transition: { staggerChildren: stagger, delayChildren: delay },
  },
});

/** Item to be used inside a staggerContainer. */
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 18 },
  show: { opacity: 1, y: 0, transition: easeOut },
};

/** Common viewport config for scroll-reveal sections. */
export const inView = { once: true, amount: 0.3 } as const;
