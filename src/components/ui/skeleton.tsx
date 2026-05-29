import { cn } from "@/lib/utils";

/**
 * Premium Skeleton — minimal, silent, with a soft shimmer sweep.
 * Uses the global `ks-shimmer` keyframe defined in src/styles.css.
 * Variants:
 *  - "default": subtle surface block with shimmer
 *  - "shine":   accent-tinted shimmer for hero placeholders
 *  - "pulse":   classic gentle pulse (no shimmer) for tiny chips
 *  - "text":    text-line block with auto rounding
 *  - "circle":  forced 1:1 rounded-full
 */
type Variant = "default" | "shine" | "pulse" | "text" | "circle";

export interface SkeletonProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: Variant;
}

function Skeleton({ className, variant = "default", ...props }: SkeletonProps) {
  const base =
    "relative isolate overflow-hidden rounded-md bg-[oklch(from_var(--foreground)_l_c_h_/_0.06)]";

  const variants: Record<Variant, string> = {
    default:
      "before:absolute before:inset-0 before:-translate-x-full before:bg-[linear-gradient(90deg,transparent,oklch(from_var(--foreground)_l_c_h_/_0.10),transparent)] before:animate-[ks-shimmer_1.6s_ease-in-out_infinite]",
    shine:
      "bg-[oklch(from_var(--primary)_l_c_h_/_0.08)] before:absolute before:inset-0 before:-translate-x-full before:bg-[linear-gradient(90deg,transparent,oklch(from_var(--primary)_l_c_h_/_0.22),transparent)] before:animate-[ks-shimmer_1.6s_ease-in-out_infinite]",
    pulse: "animate-pulse",
    text: "h-3 rounded-full before:absolute before:inset-0 before:-translate-x-full before:bg-[linear-gradient(90deg,transparent,oklch(from_var(--foreground)_l_c_h_/_0.10),transparent)] before:animate-[ks-shimmer_1.6s_ease-in-out_infinite]",
    circle:
      "aspect-square rounded-full before:absolute before:inset-0 before:-translate-x-full before:bg-[linear-gradient(90deg,transparent,oklch(from_var(--foreground)_l_c_h_/_0.10),transparent)] before:animate-[ks-shimmer_1.6s_ease-in-out_infinite]",
  };

  return <div className={cn(base, variants[variant], className)} {...props} />;
}

export { Skeleton };
