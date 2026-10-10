import { Button } from "@/components/ui/button";
import { useMemo, useState } from "react";
import { Filter, RotateCcw, Search, Tag, Layers, Sparkles } from "@/components/ui/icons";
import { AlignPanel, AlignPanelFooter, AlignPanelSection } from "@/components/align-panel";
import type { LeadRow, LeadStatus } from "@/hooks/use-leads";

export type LeadFilters = {
  q: string;
  statuses: LeadStatus[];
  nichos: string[];
  origens: string[];
  scoreMin: number;
  hasContact: "any" | "yes" | "no";
};

export const EMPTY_FILTERS: LeadFilters = {
  q: "",
  statuses: [],
  nichos: [],
  origens: [],
  scoreMin: 0,
  hasContact: "any",
};

const STATUS_OPTS: { v: LeadStatus; l: string }[] = [
  { v: "novo", l: "Novo" },
  { v: "contato_inicial", l: "Em contato" },
  { v: "qualificacao", l: "Qualificado" },
  { v: "proposta", l: "Proposta" },
  { v: "negociacao", l: "Negociação" },
  { v: "fechado", l: "Convertido" },
  { v: "perdido", l: "Perdido" },
];

export function countActiveFilters(f: LeadFilters): number {
  let n = 0;
  if (f.q.trim()) n++;
  if (f.statuses.length) n++;
  if (f.nichos.length) n++;
  if (f.origens.length) n++;
  if (f.scoreMin > 0) n++;
  if (f.hasContact !== "any") n++;
  return n;
}

export function applyLeadFilters(leads: LeadRow[], f: LeadFilters): LeadRow[] {
  const q = f.q.trim().toLowerCase();
  return leads.filter((l) => {
    if (q) {
      const hay = [l.nome, l.empresa, l.email, l.whatsapp, l.nicho, l.interesse, l.origem]
        .filter(Boolean).join(" ").toLowerCase();
      if (!hay.includes(q)) return false;
    }
    if (f.statuses.length && !f.statuses.includes(l.status)) return false;
    if (f.nichos.length) {
      const n = (l.nicho ?? l.interesse ?? "").trim();
      if (!n || !f.nichos.includes(n)) return false;
    }
    if (f.origens.length) {
      if (!l.origem || !f.origens.includes(l.origem)) return false;
    }
    if (f.scoreMin > 0 && (l.ai_score ?? 0) < f.scoreMin) return false;
    if (f.hasContact === "yes" && !l.email && !l.whatsapp) return false;
    if (f.hasContact === "no" && (l.email || l.whatsapp)) return false;
    return true;
  });
}

export function LeadFiltersDialog({
  leads,
  value,
  onChange,
}: {
  leads: LeadRow[];
  value: LeadFilters;
  onChange: (f: LeadFilters) => void;
}) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState<LeadFilters>(value);

  const nichoOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads) {
      const n = (l.nicho ?? l.interesse ?? "").trim();
      if (n) set.add(n);
    }
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [leads]);

  const origemOptions = useMemo(() => {
    const set = new Set<string>();
    for (const l of leads) if (l.origem) set.add(l.origem);
    return Array.from(set).sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [leads]);

  const activeCount = countActiveFilters(value);
  const previewCount = applyLeadFilters(leads, draft).length;

  function openPanel() {
    setDraft(value);
    setOpen(true);
  }

  function apply() {
    onChange(draft);
    setOpen(false);
  }

  function clearAll() {
    setDraft(EMPTY_FILTERS);
  }

  function toggle<T extends string>(list: T[], v: T): T[] {
    return list.includes(v) ? list.filter((x) => x !== v) : [...list, v];
  }

  return (
    <>
      <Button variant="unstyled" size="unstyled"
        onClick={openPanel}
        className={[
          "relative inline-flex h-10 items-center gap-1.5 rounded-lg border px-3 text-sm transition",
          activeCount > 0
            ? "border-primary/50 bg-primary/10 text-primary"
            : "border-border bg-surface-1 text-muted-foreground hover:text-foreground",
        ].join(" ")}
      >
        <Filter className="h-3.5 w-3.5" /> Filtros
        {activeCount > 0 && (
          <span className="ml-0.5 inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
            {activeCount}
          </span>
        )}
      </Button>

      <AlignPanel
        open={open}
        onClose={() => setOpen(false)}
        eyebrow="Leads"
        title="Filtros"
        subtitle="Refine sua lista para focar nos leads certos"
        widthClass="md:max-w-[640px]"
        footer={
          <AlignPanelFooter
            secondary={{ label: "Limpar tudo", onClick: clearAll }}
            primary={{
              label: `Aplicar · ${previewCount} lead${previewCount === 1 ? "" : "s"}`,
              onClick: apply,
            }}
          />
        }
      >
        <div className="space-y-5">
          <AlignPanelSection title="Busca" icon={Search}>
            <input
              autoFocus
              value={draft.q}
              onChange={(e) => setDraft({ ...draft, q: e.target.value })}
              placeholder="Nome, empresa, email, telefone..."
              className="h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
            />
          </AlignPanelSection>

          <AlignPanelSection title="Status" icon={Layers}>
            <div className="flex flex-wrap gap-1.5">
              {STATUS_OPTS.map((s) => {
                const on = draft.statuses.includes(s.v);
                return (
                  <Button variant="unstyled" size="unstyled"
                    key={s.v}
                    type="button"
                    onClick={() => setDraft({ ...draft, statuses: toggle(draft.statuses, s.v) })}
                    className={[
                      "rounded-full border px-3 py-1 text-xs font-medium transition",
                      on
                        ? "border-primary/60 bg-primary/15 text-primary"
                        : "border-border bg-surface-2 text-muted-foreground hover:text-foreground",
                    ].join(" ")}
                  >
                    {s.l}
                  </Button>
                );
              })}
            </div>
          </AlignPanelSection>

          <AlignPanelSection
            title="Nicho"
            icon={Tag}
            action={
              nichoOptions.length > 0 ? (
                <span className="text-[11px] text-muted-foreground">{nichoOptions.length} nichos cadastrados</span>
              ) : undefined
            }
          >
            {nichoOptions.length === 0 ? (
              <p className="rounded-lg border border-dashed border-border bg-surface-2 p-3 text-xs text-muted-foreground">
                Nenhum nicho cadastrado ainda. Adicione o nicho ao criar ou editar um lead.
              </p>
            ) : (
              <div className="flex flex-wrap gap-1.5">
                {nichoOptions.map((n) => {
                  const on = draft.nichos.includes(n);
                  return (
                    <Button variant="unstyled" size="unstyled"
                      key={n}
                      type="button"
                      onClick={() => setDraft({ ...draft, nichos: toggle(draft.nichos, n) })}
                      className={[
                        "rounded-full border px-3 py-1 text-xs font-medium transition",
                        on
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-border bg-surface-2 text-muted-foreground hover:text-foreground",
                      ].join(" ")}
                    >
                      {n}
                    </Button>
                  );
                })}
              </div>
            )}
          </AlignPanelSection>

          {origemOptions.length > 0 && (
            <AlignPanelSection title="Origem">
              <div className="flex flex-wrap gap-1.5">
                {origemOptions.map((o) => {
                  const on = draft.origens.includes(o);
                  return (
                    <Button variant="unstyled" size="unstyled"
                      key={o}
                      type="button"
                      onClick={() => setDraft({ ...draft, origens: toggle(draft.origens, o) })}
                      className={[
                        "rounded-full border px-3 py-1 text-xs font-medium transition",
                        on
                          ? "border-primary/60 bg-primary/15 text-primary"
                          : "border-border bg-surface-2 text-muted-foreground hover:text-foreground",
                      ].join(" ")}
                    >
                      {o}
                    </Button>
                  );
                })}
              </div>
            </AlignPanelSection>
          )}

          <AlignPanelSection title="Qualificação" icon={Sparkles}>
            <div className="grid grid-cols-2 gap-3">
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Score IA mínimo
                </span>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    type="range"
                    min={0}
                    max={100}
                    step={5}
                    value={draft.scoreMin}
                    onChange={(e) => setDraft({ ...draft, scoreMin: Number(e.target.value) })}
                    className="flex-1 accent-primary"
                  />
                  <span className="w-10 text-right text-sm font-bold tabular-nums">{draft.scoreMin}</span>
                </div>
              </label>
              <label className="block">
                <span className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
                  Contato disponível
                </span>
                <select
                  value={draft.hasContact}
                  onChange={(e) => setDraft({ ...draft, hasContact: e.target.value as LeadFilters["hasContact"] })}
                  className="mt-2 h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20"
                >
                  <option value="any">Todos</option>
                  <option value="yes">Com email ou WhatsApp</option>
                  <option value="no">Sem contato</option>
                </select>
              </label>
            </div>
          </AlignPanelSection>

          {activeCount > 0 && (
            <Button variant="unstyled" size="unstyled"
              type="button"
              onClick={clearAll}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" /> Limpar filtros
            </Button>
          )}
        </div>
      </AlignPanel>
    </>
  );
}
