import { useState } from "react";
import { X, Sparkles, FolderPlus, Plus, Loader2, Calendar, Clock, ListChecks } from "lucide-react";
import {
  useProjectTemplates, useCreateProjectTemplate, useDeleteProjectTemplate, useApplyProjectTemplate,
  SEED_TEMPLATES, type ProjectTemplate,
} from "@/hooks/use-project-templates";
import { useLeads } from "@/hooks/use-leads";
import { useClients } from "@/hooks/use-clients";

export function ProjectTemplatesGallery({ onClose, onApplied }: { onClose: () => void; onApplied?: (projectId: string) => void }) {
  const { data: templates = [], isLoading } = useProjectTemplates();
  const createT = useCreateProjectTemplate();
  const delT = useDeleteProjectTemplate();
  const apply = useApplyProjectTemplate();
  const { data: leads = [] } = useLeads();
  const { data: clients = [] } = useClients();

  const [selected, setSelected] = useState<ProjectTemplate | null>(null);
  const [seedOpen, setSeedOpen] = useState(true);

  async function seedAll() {
    for (const t of SEED_TEMPLATES) {
      await createT.mutateAsync(t as any);
    }
    setSeedOpen(false);
  }

  if (selected) return <ApplyTemplate template={selected} onCancel={() => setSelected(null)} onClose={onClose} onApplied={onApplied} leads={leads} clients={clients} apply={apply} />;

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4" onClick={onClose}>
      <div className="w-full max-w-4xl max-h-[85vh] overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-elevated flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-5">
          <div className="flex items-center gap-3">
            <div className="grid h-10 w-10 place-items-center rounded-2xl bg-primary/15 ring-1 ring-primary/30">
              <Sparkles className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h2 className="font-display text-lg font-semibold tracking-tight">Templates de Projeto</h2>
              <p className="text-xs text-muted-foreground">Aplique um modelo pré-pronto e ganhe etapas, entregas e tarefas em segundos.</p>
            </div>
          </div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-md text-muted-foreground hover:bg-surface-3"><X className="h-4 w-4" /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {templates.length === 0 && seedOpen && !isLoading && (
            <div className="rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-5 text-center">
              <Sparkles className="mx-auto mb-2 h-6 w-6 text-primary" />
              <h3 className="text-sm font-semibold">Comece com templates prontos</h3>
              <p className="mx-auto mt-1 max-w-md text-xs text-muted-foreground">Adicionamos 4 modelos clássicos: Onboarding, Implantação SaaS, Campanha e Sprint de Dev.</p>
              <button onClick={seedAll} disabled={createT.isPending}
                className="mt-3 inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
                {createT.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Plus className="h-3.5 w-3.5" />} Importar templates iniciais
              </button>
            </div>
          )}

          <div className="grid gap-3 sm:grid-cols-2">
            {templates.map((t) => (
              <article key={t.id} className="group rounded-xl border border-border bg-surface-2 p-4 transition hover:border-primary/40 hover:shadow-card">
                <div className="mb-2 flex items-start justify-between">
                  <h4 className="font-semibold tracking-tight">{t.nome}</h4>
                  <button onClick={() => { if (confirm(`Remover "${t.nome}"?`)) delT.mutate(t.id); }}
                    className="opacity-0 group-hover:opacity-100 text-muted-foreground hover:text-destructive">
                    <X className="h-3.5 w-3.5" />
                  </button>
                </div>
                {t.descricao && <p className="mb-3 text-xs text-muted-foreground">{t.descricao}</p>}
                <div className="mb-3 flex flex-wrap gap-1.5 text-[10px]">
                  {t.categoria && <span className="rounded bg-primary/10 px-1.5 py-0.5 font-semibold text-primary">{t.categoria}</span>}
                  <span className="inline-flex items-center gap-1 rounded bg-surface-3 px-1.5 py-0.5 text-muted-foreground"><Clock className="h-2.5 w-2.5" />{t.duracao_dias ?? "?"}d</span>
                  <span className="inline-flex items-center gap-1 rounded bg-surface-3 px-1.5 py-0.5 text-muted-foreground"><ListChecks className="h-2.5 w-2.5" />{t.tarefas.length} tarefas</span>
                  <span className="inline-flex items-center gap-1 rounded bg-surface-3 px-1.5 py-0.5 text-muted-foreground"><Calendar className="h-2.5 w-2.5" />{t.entregas.length} entregas</span>
                  {t.auto_on_lead_won && <span className="rounded bg-success/15 px-1.5 py-0.5 font-semibold text-success">auto: lead fechado</span>}
                </div>
                <button onClick={() => setSelected(t)}
                  className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-primary px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow">
                  <FolderPlus className="h-3.5 w-3.5" /> Aplicar template
                </button>
              </article>
            ))}
          </div>

          {!isLoading && templates.length === 0 && !seedOpen && (
            <div className="rounded-2xl border border-dashed border-border p-10 text-center">
              <p className="text-sm text-muted-foreground">Nenhum template ainda.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function ApplyTemplate({ template, onCancel, onClose, onApplied, leads, clients, apply }: any) {
  const [titulo, setTitulo] = useState(template.nome);
  const [leadId, setLeadId] = useState("");
  const [clientId, setClientId] = useState("");

  async function go() {
    const proj = await apply.mutateAsync({ template, leadId: leadId || undefined, clientId: clientId || undefined, titulo });
    onApplied?.(proj.id);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/70 backdrop-blur-sm p-4" onClick={onCancel}>
      <div className="w-full max-w-lg rounded-2xl border border-border bg-surface-1 shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border p-5">
          <h2 className="font-display text-lg font-semibold tracking-tight">Aplicar: {template.nome}</h2>
          <button onClick={onCancel} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-3"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 p-5">
          <label className="block">
            <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Título do projeto</div>
            <input value={titulo} onChange={(e) => setTitulo(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm focus:border-primary/60 focus:outline-none" />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Lead (opcional)</div>
              <select value={leadId} onChange={(e) => setLeadId(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm">
                <option value="">— Nenhum —</option>
                {leads.map((l: any) => <option key={l.id} value={l.id}>{l.empresa || l.nome}</option>)}
              </select>
            </label>
            <label className="block">
              <div className="mb-1 text-[11px] font-medium uppercase tracking-wider text-muted-foreground">Cliente (opcional)</div>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm">
                <option value="">— Nenhum —</option>
                {clients.map((c: any) => <option key={c.id} value={c.id}>{c.empresa || c.nome}</option>)}
              </select>
            </label>
          </div>
          <div className="rounded-lg border border-border bg-surface-2 p-3 text-xs">
            <div className="font-semibold mb-1">O que será criado:</div>
            <ul className="space-y-0.5 text-muted-foreground">
              <li>• 1 projeto com {template.etapas.length} etapas e {template.entregas.length} entregas</li>
              <li>• {template.tarefas.length} tarefas com prazos relativos ao início</li>
            </ul>
          </div>
        </div>
        <div className="flex justify-end gap-2 border-t border-border p-4">
          <button onClick={onCancel} className="rounded-lg border border-border bg-surface-2 px-4 py-2 text-xs font-medium">Cancelar</button>
          <button onClick={go} disabled={apply.isPending}
            className="inline-flex items-center gap-1.5 rounded-lg bg-primary px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow disabled:opacity-50">
            {apply.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <FolderPlus className="h-3.5 w-3.5" />} Criar projeto
          </button>
        </div>
      </div>
    </div>
  );
}
