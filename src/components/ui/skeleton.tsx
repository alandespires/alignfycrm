import { motion, type HTMLMotionProps } from "framer-motion";
import { cn } from "@/lib/utils";

/**
 * Premium Skeleton — soft entry (fade+scale) plus continuous shimmer sweep.
 * Shimmer runs via CSS keyframe `ks-sweep` (styles.css) for perf,
 * entry uses Framer Motion so items compose with stagger containers.
 */
type Variant = "default" | "shine" | "pulse" | "text" | "circle";

export interface SkeletonProps extends HTMLMotionProps<"div"> {
  variant?: Variant;
}

function Skeleton({ className, variant = "default", ...props }: SkeletonProps) {
  const base =
    "relative isolate overflow-hidden rounded-md bg-[oklch(from_var(--foreground)_l_c_h_/_0.06)]";

  const sweep =
    "before:absolute before:inset-0 before:-translate-x-full before:bg-[linear-gradient(90deg,transparent,oklch(from_var(--foreground)_l_c_h_/_0.10),transparent)] before:animate-[ks-sweep_1.6s_ease-in-out_infinite]";
  const sweepPrimary =
    "before:absolute before:inset-0 before:-translate-x-full before:bg-[linear-gradient(90deg,transparent,oklch(from_var(--primary)_l_c_h_/_0.22),transparent)] before:animate-[ks-sweep_1.6s_ease-in-out_infinite]";

  const variants: Record<Variant, string> = {
    default: sweep,
    shine: `bg-[oklch(from_var(--primary)_l_c_h_/_0.08)] ${sweepPrimary}`,
    pulse: "animate-pulse",
    text: `h-3 rounded-full ${sweep}`,
    circle: `aspect-square rounded-full ${sweep}`,
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.98 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.22, ease: [0.32, 0.72, 0, 1] }}
      className={cn(base, variants[variant], className)}
      {...props}
    />
  );
}

export { Skeleton };
