import { Button } from "@/components/ui/button";
import { Eye, EyeOff } from "@/components/ui/icons";
import { usePrivacyMode } from "@/hooks/use-privacy";

export function PrivacyToggle({
  hidden,
  onToggle,
  className,
}: {
  hidden?: boolean;
  onToggle?: () => void;
  className?: string;
}) {
  const uncontrolled = usePrivacyMode();
  const isHidden = hidden ?? uncontrolled.hidden;
  const handleToggle = onToggle ?? uncontrolled.toggle;
  const label = isHidden ? "Mostrar valores" : "Ocultar valores";
  return (
    <Button
      variant="unstyled"
      size="unstyled"
      onClick={handleToggle}
      title={label}
      aria-label={label}
      aria-pressed={isHidden}
      className={className ?? "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border border-border bg-surface-1 text-muted-foreground transition-colors hover:text-foreground"}
    >
      {isHidden ? <Eye className="h-4 w-4" /> : <EyeOff className="h-4 w-4" />}
    </Button>
  );
}
