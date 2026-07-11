/**
 * Global motion presets — Framer Motion.
 * Apple-inspired easings, honoring prefers-reduced-motion.
 */
import type { Transition, Variants } from "framer-motion";

export const EASE_OUT = [0.32, 0.72, 0, 1] as const;
export const EASE_IN_OUT = [0.65, 0, 0.35, 1] as const;

export const DUR = {
  micro: 0.18,
  base: 0.28,
  panel: 0.38,
} as const;

export const springSoft: Transition = { type: "spring", stiffness: 380, damping: 32, mass: 0.7 };

export const fadeIn: Variants = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: DUR.base, ease: EASE_OUT } },
  exit: { opacity: 0, transition: { duration: DUR.micro, ease: EASE_OUT } },
};

export const fadeUp: Variants = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0, transition: { duration: DUR.base, ease: EASE_OUT } },
  exit: { opacity: 0, y: -4, transition: { duration: DUR.micro, ease: EASE_OUT } },
};

export const scaleIn: Variants = {
  initial: { opacity: 0, scale: 0.96 },
  animate: { opacity: 1, scale: 1, transition: { duration: DUR.base, ease: EASE_OUT } },
  exit: { opacity: 0, scale: 0.98, transition: { duration: DUR.micro, ease: EASE_OUT } },
};

export const slidePanelX: Variants = {
  initial: { x: "100%" },
  animate: { x: 0, transition: { duration: DUR.panel, ease: EASE_OUT } },
  exit: { x: "100%", transition: { duration: DUR.base, ease: EASE_OUT } },
};

export const slidePanelY: Variants = {
  initial: { y: "100%" },
  animate: { y: 0, transition: { duration: DUR.panel, ease: EASE_OUT } },
  exit: { y: "100%", transition: { duration: DUR.base, ease: EASE_OUT } },
};

export const staggerContainer: Variants = {
  initial: {},
  animate: { transition: { staggerChildren: 0.03, delayChildren: 0.02 } },
  exit: {},
};

export const staggerItem: Variants = fadeUp;
