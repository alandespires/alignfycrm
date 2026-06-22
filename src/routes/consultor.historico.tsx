import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useConsultorAudit, ENTITY_LABEL, ACTION_LABEL, type AuditEntityType, type AuditAction } from "@/hooks/use-consultor-audit";
import { History, Plus, Pencil, Trash2 } from "lucide-react";

export const Route = createFileRoute("/consultor/historico")({
  component: HistoricoPage,
});

const ACTION_TONE: Record<AuditAction, string> = {
  create: "bg-emerald-500/15 text-emerald-500",
  update: "bg-blue-500/15 text-blue-500",
  delete: "bg-rose-500/15 text-rose-500",
};
const ACTION_ICON: Record<AuditAction, any> = { create: Plus, update: Pencil, delete: Trash2 };

function HistoricoPage() {
  const [entity, setEntity] = useState<AuditEntityType | "">("");
  const [since, setSince] = useState<string>("");
  const [until, setUntil] = useState<string>("");
  const { data: logs = [], isLoading } = useConsultorAudit({
    entityType: entity || undefined,
    since: since ? new Date(since).toISOString() : undefined,
    until: until ? new Date(until + "T23:59:59").toISOString() : undefined,
    limit: 500,
  });

  const grouped = useMemo(() => {
    const m: Record<string, typeof logs> = {};
    for (const l of logs) {
      const d = new Date(l.created_at).toLocaleDateString("pt-BR");
      (m[d] ||= []).push(l);
    }
    return m;
  }, [logs]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-surface-1 p-3">
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Tipo</span>
          <select value={entity} onChange={e => setEntity(e.target.value as any)}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs">
            <option value="">Todos</option>
            {Object.entries(ENTITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">De</span>
          <input type="date" value={since} onChange={e => setSince(e.target.value)}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Até</span>
          <input type="date" value={until} onChange={e => setUntil(e.target.value)}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs" />
        </label>
        <span className="ml-auto text-xs text-muted-foreground">{logs.length} evento(s)</span>
      </div>

      {isLoading && <div className="rounded-2xl border border-border p-6 text-center text-sm text-muted-foreground">Carregando…</div>}

      {!isLoading && Object.entries(grouped).map(([day, items]) => (
        <div key={day} className="rounded-2xl border border-border bg-surface-1 p-4">
          <h3 className="mb-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">{day}</h3>
          <div className="space-y-2">
            {items.map(l => {
              const Icon = ACTION_ICON[l.action];
              const changedKeys = l.action === "update" && l.diff && typeof l.diff === "object"
                ? Object.keys(l.diff).slice(0, 5) : [];
              return (
                <div key={l.id} className="flex items-start gap-3 rounded-xl border border-border bg-surface-2 px-3 py-2.5">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-lg ${ACTION_TONE[l.action]}`}>
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium">
                      {ENTITY_LABEL[l.entity_type]} · {ACTION_LABEL[l.action]}
                      <span className="ml-2 text-xs text-muted-foreground">{new Date(l.created_at).toLocaleTimeString("pt-BR")}</span>
                    </div>
                    {changedKeys.length > 0 && (
                      <div className="mt-1 flex flex-wrap gap-1">
                        {changedKeys.map(k => (
                          <span key={k} className="rounded-md border border-border bg-background px-1.5 py-0.5 text-[10px] text-muted-foreground">
                            {k}: <span className="text-foreground">{fmtVal(l.diff?.[k]?.to)}</span>
                          </span>
                        ))}
                      </div>
                    )}
                    <div className="mt-1 text-[10px] text-muted-foreground">#{l.entity_id.slice(0, 8)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}

      {!isLoading && !logs.length && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          <History className="mx-auto mb-2 h-6 w-6 opacity-50" />
          Nenhum evento auditado no período.
        </div>
      )}
    </div>
  );
}

function fmtVal(v: any) {
  if (v === null || v === undefined) return "—";
  if (typeof v === "object") return JSON.stringify(v).slice(0, 40);
  return String(v).slice(0, 40);
}
