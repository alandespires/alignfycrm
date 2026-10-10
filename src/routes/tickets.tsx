import { pageHead } from "@/lib/page-head";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, PrimaryButton, StatusPill } from "@/components/app-shell";
import { AlignPanel, AlignPanelFooter } from "@/components/align-panel";
import { useTickets, useUpsertTicket, useDeleteTicket, type TicketRow, type TicketStatus, type TicketPriority } from "@/hooks/use-tickets";
import { useCompanies } from "@/hooks/use-companies";
import { useRealtimeSync } from "@/hooks/use-realtime";
import { LifeBuoy, Plus, Pencil, Trash2, Search, X, AlertTriangle, Clock, CheckCircle2 } from "@/components/ui/icons";
import { toast } from "sonner";

export const Route = createFileRoute("/tickets")({
  head: () => pageHead("Suporte / Tickets"),
  component: TicketsPage,
});

const STATUS_LABEL: Record<TicketStatus, string> = {
  aberto: "Aberto", em_andamento: "Em andamento", aguardando: "Aguardando", resolvido: "Resolvido", fechado: "Fechado",
};
const STATUS_TONE = (s: TicketStatus): any =>
  s === "resolvido" || s === "fechado" ? "success" : s === "em_andamento" ? "info" : s === "aguardando" ? "warn" : "danger";

const PRIORITY_LABEL: Record<TicketPriority, string> = { baixa: "Baixa", media: "Média", alta: "Alta", urgente: "Urgente" };
const PRIORITY_TONE = (p: TicketPriority): any =>
  p === "urgente" ? "danger" : p === "alta" ? "warn" : p === "media" ? "info" : "neutral";

function TicketsPage() {
  useRealtimeSync([{ table: "tickets", queryKeys: [["tickets"]] }]);
  const { data: tickets = [], isLoading } = useTickets();
  const { data: companies = [] } = useCompanies();
  const upsert = useUpsertTicket();
  const del = useDeleteTicket();
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<TicketStatus | "todos">("todos");
  const [editing, setEditing] = useState<Partial<TicketRow> | null>(null);

  const companyMap = useMemo(() => new Map(companies.map((c) => [c.id, c.nome])), [companies]);

  const filtered = useMemo(() => tickets.filter((t) => {
    if (statusFilter !== "todos" && t.status !== statusFilter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return t.assunto.toLowerCase().includes(q) || String(t.numero).includes(query);
  }), [tickets, query, statusFilter]);

  const abertos = tickets.filter((t) => t.status !== "resolvido" && t.status !== "fechado");
  const urgentes = abertos.filter((t) => t.prioridade === "urgente" || t.prioridade === "alta").length;
  const slaVencido = abertos.filter((t) => t.sla_vencimento && new Date(t.sla_vencimento) < new Date()).length;
  const resolvMes = tickets.filter((t) => {
    if (!t.resolvido_em) return false;
    const d = new Date(t.resolvido_em); const n = new Date();
    return d.getMonth() === n.getMonth() && d.getFullYear() === n.getFullYear();
  }).length;

  return (
    <AppShell
      title="Suporte"
      subtitle={`${abertos.length} em aberto · ${slaVencido} com SLA vencido`}
      action={<PrimaryButton icon={Plus} onClick={() => setEditing({ assunto: "", status: "aberto", prioridade: "media" })}>Novo ticket</PrimaryButton>}
    >
      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Em aberto" value={String(abertos.length)} icon={LifeBuoy} />
        <Kpi label="Prioridade alta" value={String(urgentes)} icon={AlertTriangle} />
        <Kpi label="SLA vencido" value={String(slaVencido)} icon={Clock} />
        <Kpi label="Resolvidos no mês" value={String(resolvMes)} icon={CheckCircle2} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por assunto ou número…"
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" />
          </div>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm">
            <option value="todos">Todos</option>
            {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <span className="text-xs text-muted-foreground">{filtered.length}/{tickets.length}</span>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={LifeBuoy} label={tickets.length === 0 ? "Nenhum ticket ainda" : "Nada encontrado"}
            cta={{ label: "Abrir primeiro", onClick: () => setEditing({ assunto: "", status: "aberto", prioridade: "media" }) }} />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-2/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">#</th>
                <th className="px-5 py-3 font-medium">Assunto</th>
                <th className="px-5 py-3 font-medium">Status</th>
                <th className="px-5 py-3 font-medium">Prioridade</th>
                <th className="px-5 py-3 font-medium">SLA</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((t) => {
                const slaBust = t.sla_vencimento && new Date(t.sla_vencimento) < new Date() && t.status !== "resolvido" && t.status !== "fechado";
                return (
                  <tr key={t.id} className="transition hover:bg-surface-2/40">
                    <td className="px-5 py-3 text-xs font-mono text-muted-foreground">#{t.numero}</td>
                    <td className="px-5 py-3">
                      <div className="font-medium">{t.assunto}</div>
                      {t.company_id && <div className="text-xs text-muted-foreground">{companyMap.get(t.company_id) ?? ""}</div>}
                    </td>
                    <td className="px-5 py-3"><StatusPill tone={STATUS_TONE(t.status)}>{STATUS_LABEL[t.status]}</StatusPill></td>
                    <td className="px-5 py-3"><StatusPill tone={PRIORITY_TONE(t.prioridade)}>{PRIORITY_LABEL[t.prioridade]}</StatusPill></td>
                    <td className={`px-5 py-3 text-xs ${slaBust ? "text-destructive font-semibold" : "text-muted-foreground"}`}>
                      {t.sla_vencimento ? new Date(t.sla_vencimento).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" }) : "—"}
                    </td>
                    <td className="px-5 py-3">
                      <div className="flex justify-end gap-1">
                        <Button variant="unstyled" size="unstyled" onClick={() => setEditing(t)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-surface-3 hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="unstyled" size="unstyled" onClick={() => { if (confirm(`Excluir ticket #${t.numero}?`)) del.mutate(t.id); }} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/15 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <TicketDialog draft={editing} companies={companies} onClose={() => setEditing(null)}
          onSave={(t) => {
            if (!t.assunto?.trim()) { toast.error("Informe o assunto"); return; }
            upsert.mutate({
              id: t.id, assunto: t.assunto!, descricao: t.descricao ?? undefined,
              status: (t.status as TicketStatus) ?? "aberto",
              prioridade: (t.prioridade as TicketPriority) ?? "media",
              company_id: t.company_id ?? null,
            }, { onSuccess: () => setEditing(null) });
          }} />
      )}
    </AppShell>
  );
}

function Kpi({ label, value, icon: Icon }: { label: string; value: string; icon?: any }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-1 p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40">
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
        {Icon && <Icon className="h-4 w-4 text-primary" />}
      </div>
      <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function EmptyState({ icon: Icon, label, cta }: { icon: any; label: string; cta?: { label: string; onClick: () => void } }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
      <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><Icon className="h-6 w-6" /></div>
      <p className="text-sm font-medium">{label}</p>
      {cta && <Button variant="unstyled" size="unstyled" onClick={cta.onClick} className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90"><Plus className="h-3.5 w-3.5" /> {cta.label}</Button>}
    </div>
  );
}

function TicketDialog({ draft, companies, onClose, onSave }: { draft: Partial<TicketRow>; companies: { id: string; nome: string }[]; onClose: () => void; onSave: (t: Partial<TicketRow>) => void }) {
  const [t, setT] = useState(draft);
  return (
    <AlignPanel
      open
      onClose={onClose}
      eyebrow="Ticket"
      title={t.id ? `Ticket #${t.numero}` : "Novo ticket"}
      widthClass="md:max-w-[560px]"
      footer={
        <AlignPanelFooter
          secondary={{ label: "Cancelar", onClick: onClose }}
          primary={{ label: "Salvar", onClick: () => onSave(t) }}
        />
      }
    >
      <div className="space-y-3">
          <L label="Assunto"><Inp value={t.assunto ?? ""} onChange={(v) => setT({ ...t, assunto: v })} autoFocus /></L>
          <L label="Descrição">
            <textarea value={t.descricao ?? ""} onChange={(e) => setT({ ...t, descricao: e.target.value })} rows={3}
              className="w-full rounded-lg border border-border bg-background px-3 py-2 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" />
          </L>
          <div className="grid grid-cols-2 gap-3">
            <L label="Status">
              <select value={t.status ?? "aberto"} onChange={(e) => setT({ ...t, status: e.target.value as TicketStatus })}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm">
                {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </L>
            <L label="Prioridade">
              <select value={t.prioridade ?? "media"} onChange={(e) => setT({ ...t, prioridade: e.target.value as TicketPriority })}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm">
                {Object.entries(PRIORITY_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
              </select>
            </L>
          </div>
          <L label="Empresa">
            <select value={t.company_id ?? ""} onChange={(e) => setT({ ...t, company_id: e.target.value || null })}
              className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm">
              <option value="">— Nenhuma —</option>
              {companies.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
            </select>
          </L>
      </div>
    </AlignPanel>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>{children}</label>;
}
function Inp({ onChange, ...rest }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & { onChange: (v: string) => void }) {
  return <input {...rest} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" />;
}
