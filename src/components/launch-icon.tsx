import { cn } from "@/lib/utils";

/**
 * Launch logo — círculo sem preenchimento com stroke de 8px na cor primária.
 * Logo oficial do Launch (IA do Align CRM).
 */
export function LaunchIcon({
  className,
  size,
}: {
  className?: string;
  size?: number | string;
}) {
  return (
    <svg
      viewBox="0 0 64 64"
      width={size}
      height={size}
      fill="none"
      stroke="currentColor"
      strokeWidth={8}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("text-primary", className)}
    >
      <circle cx="32" cy="32" r="24" />
    </svg>
  );
}
