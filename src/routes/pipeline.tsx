import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import {
  DndContext, DragOverlay, PointerSensor, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent, useDraggable, useDroppable,
} from "@dnd-kit/core";
import { AppShell } from "@/components/app-shell";
import { LeadFormDialog } from "@/components/lead-form-dialog";
import { RealtimeBadge } from "@/components/realtime-badge";
import { formatBRL } from "@/lib/mock-data";
import { useLeads, useUpdateLeadStatus, type LeadRow, type LeadStatus } from "@/hooks/use-leads";
import { useScoreLead } from "@/hooks/use-score-lead";
import { useRealtimeSync } from "@/hooks/use-realtime";
import { Plus, Filter, Sparkles, Loader2 } from "lucide-react";
import { KanbanSkeleton } from "@/components/skeletons";

const STAGES: { id: LeadStatus; label: string; color: string }[] = [
  { id: "novo", label: "Novo Lead", color: "oklch(0.65 0.02 250)" },
  { id: "contato_inicial", label: "Contato Inicial", color: "oklch(0.7 0.12 220)" },
  { id: "qualificacao", label: "Qualificação", color: "oklch(0.72 0.14 180)" },
  { id: "proposta", label: "Proposta", color: "oklch(0.78 0.16 80)" },
  { id: "negociacao", label: "Negociação", color: "oklch(0.685 0.175 45)" },
  { id: "fechado", label: "Fechado", color: "oklch(0.72 0.21 142)" },
  { id: "perdido", label: "Perdido", color: "oklch(0.55 0.18 25)" },
];

export const Route = createFileRoute("/pipeline")({
  head: () => ({ meta: [{ title: "Pipeline — Launcher CRM" }] }),
  component: PipelinePage,
});

function ScoreBadge({ score }: { score: number }) {
  const tone = score >= 80 ? "text-success bg-success/15" : score >= 50 ? "text-warning bg-warning/15" : "text-muted-foreground bg-surface-3";
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold tabular-nums ${tone}`}>
      <Sparkles className="h-2.5 w-2.5" /> {score}
    </span>
  );
}

function initialsOf(name: string) {
  return name.split(" ").map((s) => s[0]).filter(Boolean).slice(0, 2).join("").toUpperCase() || "?";
}

function LeadCard({ lead, dragging }: { lead: LeadRow; dragging?: boolean }) {
  const score = useScoreLead();
  const isScoring = score.isPending && score.variables === lead.id;
  return (
    <div className={[
      "group cursor-grab rounded-xl border border-border bg-surface-2 p-3.5 shadow-card transition active:cursor-grabbing",
      dragging ? "opacity-40" : "hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated",
    ].join(" ")}>
      <div className="mb-2 flex items-start justify-between gap-2">
        <h4 className="text-sm font-semibold leading-snug">{lead.empresa || lead.nome}</h4>
        <ScoreBadge score={lead.ai_score ?? 0} />
      </div>
      <p className="text-xs text-muted-foreground">{lead.nome}{lead.interesse ? ` · ${lead.interesse}` : ""}</p>

      {lead.ai_sugestao && (
        <div className="mt-2 rounded-md border border-primary/20 bg-primary/5 px-2 py-1.5">
          <div className="flex items-center gap-1 text-[9px] font-semibold uppercase tracking-wider text-primary">
            <Sparkles className="h-2.5 w-2.5" /> Próxima ação
          </div>
          <p className="mt-0.5 line-clamp-2 text-[11px] leading-snug text-foreground/90">{lead.ai_sugestao}</p>
        </div>
      )}

      <div className="mt-3 flex items-center justify-between">
        <span className="text-sm font-semibold text-foreground tabular-nums">
          {lead.valor_estimado && lead.valor_estimado > 0 ? formatBRL(Number(lead.valor_estimado)) : "—"}
        </span>
        <div className="flex items-center gap-1.5">
          <button
            onPointerDown={(e) => e.stopPropagation()}
            onClick={(e) => { e.stopPropagation(); score.mutate(lead.id); }}
            disabled={isScoring}
            title="Analisar com IA"
            className="grid h-6 w-6 place-items-center rounded-md border border-border bg-surface-1 text-muted-foreground transition hover:border-primary/50 hover:text-primary disabled:opacity-50"
          >
            {isScoring ? <Loader2 className="h-3 w-3 animate-spin" /> : <Sparkles className="h-3 w-3" />}
          </button>
          <div className="grid h-6 w-6 place-items-center rounded-md bg-gradient-to-br from-primary/80 to-[oklch(0.55_0.16_35)] text-[10px] font-bold text-primary-foreground">
            {initialsOf(lead.nome)}
          </div>
        </div>
      </div>
      {lead.tags && lead.tags.length > 0 && (
        <div className="mt-2.5 flex flex-wrap gap-1">
          {lead.tags.map((t) => (
            <span key={t} className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">{t}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function DraggableLead({ lead }: { lead: LeadRow }) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({ id: lead.id });
  return (
    <div ref={setNodeRef} {...listeners} {...attributes}>
      <LeadCard lead={lead} dragging={isDragging} />
    </div>
  );
}

function Column({ stage, leads }: { stage: typeof STAGES[number]; leads: LeadRow[] }) {
  const { setNodeRef, isOver } = useDroppable({ id: stage.id });
  const total = leads.reduce((a, l) => a + Number(l.valor_estimado || 0), 0);
  return (
    <div
      ref={setNodeRef}
      className={[
        "flex w-72 shrink-0 flex-col rounded-2xl border bg-surface-1/60 transition",
        isOver ? "border-primary/50 bg-primary/5" : "border-border",
      ].join(" ")}
    >
      <div className="flex items-center justify-between gap-2 border-b border-border p-3">
        <div className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full" style={{ background: stage.color, boxShadow: `0 0 8px ${stage.color}` }} />
          <span className="text-sm font-semibold">{stage.label}</span>
          <span className="rounded-md bg-surface-3 px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground tabular-nums">{leads.length}</span>
        </div>
        <LeadFormDialog
          defaultStatus={stage.id}
          trigger={
            <button className="grid h-6 w-6 place-items-center rounded-md text-muted-foreground hover:bg-surface-3 hover:text-foreground">
              <Plus className="h-3.5 w-3.5" />
            </button>
          }
        />
      </div>
      <div className="border-b border-border px-3 py-2 text-[11px] text-muted-foreground tabular-nums">{formatBRL(total)}</div>
      <div className="flex flex-1 flex-col gap-2 overflow-y-auto p-2.5" style={{ minHeight: 200 }}>
        {leads.map((l) => <DraggableLead key={l.id} lead={l} />)}
        {leads.length === 0 && (
          <div className="grid place-items-center rounded-lg border border-dashed border-border/50 p-4 text-center text-[11px] text-muted-foreground">
            Arraste um lead aqui
          </div>
        )}
      </div>
    </div>
  );
}

function PipelinePage() {
  useRealtimeSync([
    { table: "leads", queryKeys: [["leads"]] },
    { table: "activities", queryKeys: [["activities"]] },
  ]);
  const { data: leads = [], isLoading } = useLeads();
  const updateStatus = useUpdateLeadStatus();
  const [activeId, setActiveId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 4 } }));

  function onDragStart(e: DragStartEvent) { setActiveId(String(e.active.id)); }
  function onDragEnd(e: DragEndEvent) {
    setActiveId(null);
    const overId = e.over?.id as LeadStatus | undefined;
    if (!overId) return;
    const id = String(e.active.id);
    const lead = leads.find((l) => l.id === id);
    if (!lead || lead.status === overId) return;
    updateStatus.mutate({ id, status: overId });
  }

  const activeLead = leads.find((l) => l.id === activeId);
  const totalValue = leads.reduce((a, l) => a + Number(l.valor_estimado || 0), 0);

  return (
    <AppShell
      title="Pipeline"
      subtitle={`${leads.length} leads no funil · ${formatBRL(totalValue)} em pipeline`}
      action={
        <div className="flex items-center gap-2">
          <RealtimeBadge />
          <button className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-surface-1 px-3 text-sm text-muted-foreground hover:text-foreground">
            <Filter className="h-3.5 w-3.5" /> Filtros
          </button>
          <LeadFormDialog />
        </div>
      }
    >
      {isLoading ? (
        <KanbanSkeleton columns={6} />
      ) : (
        <DndContext sensors={sensors} onDragStart={onDragStart} onDragEnd={onDragEnd}>
          <div className="-mx-5 overflow-x-auto px-5 pb-4 md:-mx-8 md:px-8">
            <div className="flex gap-4">
              {STAGES.map((s) => (
                <Column key={s.id} stage={s} leads={leads.filter((l) => l.status === s.id)} />
              ))}
            </div>
          </div>
          <DragOverlay>{activeLead ? <div className="w-72"><LeadCard lead={activeLead} /></div> : null}</DragOverlay>
        </DndContext>
      )}
    </AppShell>
  );
}