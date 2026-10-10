import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell } from "@/components/app-shell";
import { useAllActivities, type ActivityType } from "@/hooks/use-activities";
import { useLeads } from "@/hooks/use-leads";
import { useRealtimeSync } from "@/hooks/use-realtime";
import { MessageSquare, Phone, Mail, Calendar, FileText, ArrowRightLeft, CheckSquare, Search } from "@/components/ui/icons";

export const Route = createFileRoute("/interacoes")({
  head: () => pageHead("Interações"),
  component: InteracoesPage,
});

const TYPE_LABEL: Record<ActivityType, string> = {
  ligacao: "Ligação", email: "Email", whatsapp: "WhatsApp", reuniao: "Reunião",
  nota: "Nota", movimentacao: "Movimentação", tarefa: "Tarefa",
};
const TYPE_ICON: Record<ActivityType, any> = {
  ligacao: Phone, email: Mail, whatsapp: MessageSquare, reuniao: Calendar,
  nota: FileText, movimentacao: ArrowRightLeft, tarefa: CheckSquare,
};

function InteracoesPage() {
  useRealtimeSync([{ table: "activities", queryKeys: [["activities"]] }]);
  const { data: activities = [], isLoading } = useAllActivities(300);
  const { data: leads = [] } = useLeads();
  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState<ActivityType | "todos">("todos");

  const leadMap = useMemo(() => new Map(leads.map((l) => [l.id, l.nome])), [leads]);

  const filtered = useMemo(() => activities.filter((a) => {
    if (typeFilter !== "todos" && a.tipo !== typeFilter) return false;
    if (!query) return true;
    return a.descricao.toLowerCase().includes(query.toLowerCase());
  }), [activities, query, typeFilter]);

  const today = new Date(); today.setHours(0, 0, 0, 0);
  const weekAgo = new Date(today); weekAgo.setDate(weekAgo.getDate() - 7);
  const hoje = activities.filter((a) => new Date(a.created_at) >= today).length;
  const semana = activities.filter((a) => new Date(a.created_at) >= weekAgo).length;
  const ligacoes = activities.filter((a) => a.tipo === "ligacao").length;
  const reunioes = activities.filter((a) => a.tipo === "reuniao").length;

  return (
    <AppShell title="Interações" subtitle={`${activities.length} registros no histórico`}>
      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Hoje" value={String(hoje)} icon={CheckSquare} />
        <Kpi label="Últimos 7 dias" value={String(semana)} icon={Calendar} />
        <Kpi label="Ligações" value={String(ligacoes)} icon={Phone} />
        <Kpi label="Reuniões" value={String(reunioes)} icon={Calendar} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar interação…"
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" />
          </div>
          <select value={typeFilter} onChange={(e) => setTypeFilter(e.target.value as any)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm">
            <option value="todos">Todos os tipos</option>
            {Object.entries(TYPE_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
          </select>
          <span className="text-xs text-muted-foreground">{filtered.length}/{activities.length}</span>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><MessageSquare className="h-6 w-6" /></div>
            <p className="text-sm font-medium">{activities.length === 0 ? "Nenhuma interação registrada" : "Nada encontrado"}</p>
            <p className="text-xs text-muted-foreground">Interações são criadas a partir de leads, oportunidades e atendimentos.</p>
          </div>
        ) : (
          <ol className="divide-y divide-border">
            {filtered.map((a) => {
              const Icon = TYPE_ICON[a.tipo] ?? MessageSquare;
              return (
                <li key={a.id} className="flex items-start gap-3 px-5 py-3 transition hover:bg-surface-2/40">
                  <div className="grid h-9 w-9 flex-shrink-0 place-items-center rounded-xl bg-primary/10 text-primary">
                    <Icon className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-medium">{a.descricao}</p>
                      <span className="flex-shrink-0 text-xs text-muted-foreground">
                        {new Date(a.created_at).toLocaleString("pt-BR", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}
                      </span>
                    </div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="rounded bg-surface-2 px-1.5 py-0.5">{TYPE_LABEL[a.tipo] ?? a.tipo}</span>
                      {a.lead_id && leadMap.get(a.lead_id) && <span>Lead: {leadMap.get(a.lead_id)}</span>}
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>
        )}
      </div>
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
