import { Link } from "@tanstack/react-router";
import { useProposals } from "@/hooks/use-proposals";
import { AlignPanelSection } from "@/components/align-panel";
import { FileText } from "@/components/ui/icons";
import { formatBRL } from "@/lib/mock-data";

const STATUS: Record<string, { label: string; cls: string }> = {
  rascunho: { label: "Rascunho", cls: "bg-muted text-muted-foreground" },
  enviada: { label: "Enviada", cls: "bg-primary/15 text-primary" },
  visualizada: { label: "Visualizada", cls: "bg-primary/15 text-primary" },
  aceita: { label: "Aceita", cls: "bg-success/15 text-success" },
  recusada: { label: "Recusada", cls: "bg-destructive/15 text-destructive" },
  expirada: { label: "Expirada", cls: "bg-warning/15 text-warning" },
};

export function EntityProposals({ leadId, clientId }: { leadId?: string | null; clientId?: string | null }) {
  const { data = [] } = useProposals();
  const list = data.filter((p) => (leadId && p.lead_id === leadId) || (clientId && p.client_id === clientId));
  const total = list.filter((p) => p.status === "aceita").reduce((s, p) => s + Number(p.valor ?? 0), 0);

  return (
    <AlignPanelSection title={`Propostas · ${list.length}`} icon={FileText}>
      {list.length === 0 ? (
        <p className="text-xs text-muted-foreground">Nenhuma proposta ainda.</p>
      ) : (
        <div className="space-y-1.5">
          {list.map((p) => {
            const s = STATUS[p.status] ?? STATUS.rascunho;
            return (
              <Link key={p.id} to="/propostas" className="flex items-center gap-2 rounded-lg border border-border bg-surface-2/40 px-3 py-2 text-sm hover:bg-surface-2">
                <span className="min-w-0 flex-1 truncate">{p.titulo}</span>
                <span className="tabular-nums text-xs text-muted-foreground">{formatBRL(Number(p.valor ?? 0))}</span>
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${s.cls}`}>{s.label}</span>
              </Link>
            );
          })}
          {total > 0 && <p className="pt-1 text-right text-xs text-muted-foreground">Aceito: {formatBRL(total)}</p>}
        </div>
      )}
    </AlignPanelSection>
  );
}
