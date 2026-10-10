import { Radio } from "@/components/ui/icons";

export type RealtimeStatus = "connecting" | "live" | "reconnecting" | "offline";

const STATUS = {
  connecting: { label: "Conectando", title: "Conectando às atualizações em tempo real", className: "border-border bg-surface-2 text-muted-foreground" },
  live: { label: "Ao vivo", title: "Atualizações em tempo real ativas", className: "border-success/30 bg-success/10 text-success" },
  reconnecting: { label: "Reconectando", title: "Tentando restabelecer as atualizações em tempo real", className: "border-warning/30 bg-warning/10 text-warning" },
  offline: { label: "Offline", title: "Atualizações em tempo real indisponíveis", className: "border-destructive/30 bg-destructive/10 text-destructive" },
} satisfies Record<RealtimeStatus, { label: string; title: string; className: string }>;

/** Estado conservador por padrão: só exibe “Ao vivo” quando o canal confirmar conexão. */
export function RealtimeBadge({ status = "offline", label }: { status?: RealtimeStatus; label?: string }) {
  const config = STATUS[status];
  return (
    <span
      title={config.title}
      role="status"
      className={`inline-flex items-center gap-1.5 rounded-full border px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider ${config.className}`}
    >
      <span className="relative flex h-2 w-2">
        {(status === "connecting" || status === "reconnecting") && <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-current opacity-50" />}
        <span className="relative inline-flex h-2 w-2 rounded-full bg-current" />
      </span>
      <Radio className="h-2.5 w-2.5" aria-hidden="true" />
      {label ?? config.label}
    </span>
  );
}
