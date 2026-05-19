import { useEffect, useMemo, useState, type ReactNode } from "react";
import { Plus, Search, Pencil, Trash2, ArrowUpRight, X, Sparkles } from "lucide-react";
import { AppShell, PrimaryButton, StatusPill } from "@/components/app-shell";
import { toast } from "sonner";

export type StubKpi = { label: string; value: string; delta?: string };
export type StubItem = {
  id: string;
  title: string;
  subtitle?: string;
  meta?: string;
  tone?: "success" | "warn" | "info" | "danger" | "neutral";
  status?: string;
};

const TONES: StubItem["tone"][] = ["success", "info", "warn", "danger", "neutral"];

function loadCollection(storageKey: string, seed: StubItem[]): StubItem[] {
  if (typeof window === "undefined") return seed;
  try {
    const raw = localStorage.getItem(storageKey);
    if (!raw) return seed;
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) return parsed as StubItem[];
  } catch {}
  return seed;
}

function persist(storageKey: string, items: StubItem[]) {
  try { localStorage.setItem(storageKey, JSON.stringify(items)); } catch {}
}

export function ModuleStub({
  title, subtitle, ctaLabel = "Criar novo", icon: Icon, kpis = [], items: seedItems = [], description, sections,
  storageKey,
}: {
  title: string;
  subtitle: string;
  ctaLabel?: string;
  icon: any;
  kpis?: StubKpi[];
  items?: StubItem[];
  description: string;
  sections?: { title: string; body: ReactNode }[];
  storageKey?: string;
}) {
  const key = storageKey ?? `launcher:module:${title.toLowerCase().replace(/\s+/g, "-")}`;
  const [items, setItems] = useState<StubItem[]>(() => loadCollection(key, seedItems));
  const [query, setQuery] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<StubItem | null>(null);

  useEffect(() => { persist(key, items); }, [key, items]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    return items.filter((it) =>
      it.title.toLowerCase().includes(q) ||
      (it.subtitle ?? "").toLowerCase().includes(q) ||
      (it.status ?? "").toLowerCase().includes(q),
    );
  }, [items, query]);

  function openCreate() { setEditing({ id: "", title: "", subtitle: "", meta: "", status: "Novo", tone: "info" }); setDialogOpen(true); }
  function openEdit(it: StubItem) { setEditing({ ...it }); setDialogOpen(true); }
  function remove(id: string) { setItems((prev) => prev.filter((p) => p.id !== id)); toast.success("Registro removido"); }
  function save(draft: StubItem) {
    if (!draft.title.trim()) { toast.error("Informe um título"); return; }
    setItems((prev) => {
      const exists = prev.find((p) => p.id === draft.id);
      if (exists) return prev.map((p) => (p.id === draft.id ? draft : p));
      return [{ ...draft, id: `it_${Date.now()}` }, ...prev];
    });
    setDialogOpen(false);
    setEditing(null);
    toast.success(draft.id ? "Registro atualizado" : "Registro criado");
  }

  return (
    <AppShell
      title={title}
      subtitle={subtitle}
      action={
        <div className="flex items-center gap-2">
          <StatusPill tone="success"><Sparkles className="mr-1 h-3 w-3" /> Ativo</StatusPill>
          <PrimaryButton icon={Plus} onClick={openCreate}>{ctaLabel}</PrimaryButton>
        </div>
      }
    >
      {/* Hero */}
      <div className="relative mb-6 overflow-hidden rounded-3xl border border-border bg-gradient-to-br from-surface-2 via-surface-1 to-surface-2 p-6 shadow-card">
        <div className="absolute -right-24 -top-24 h-64 w-64 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative flex items-start gap-4">
          <div className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-primary/15 text-primary ring-1 ring-primary/30">
            <Icon className="h-6 w-6" />
          </div>
          <div className="min-w-0 flex-1">
            <h2 className="text-lg font-semibold tracking-tight">{title}</h2>
            <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{description}</p>
          </div>
        </div>
      </div>

      {/* KPIs */}
      {kpis.length > 0 && (
        <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((k) => (
            <div key={k.label} className="group rounded-2xl border border-border bg-surface-1 p-5 shadow-card transition hover:-translate-y-0.5 hover:border-primary/40 hover:shadow-elevated">
              <div className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{k.label}</div>
              <div className="mt-2 flex items-baseline gap-2">
                <span className="text-2xl font-semibold tracking-tight">{k.value}</span>
                {k.delta && <span className="text-[11px] font-semibold text-success">{k.delta}</span>}
              </div>
            </div>
          ))}
        </div>
      )}

      {sections?.map((s) => (
        <div key={s.title} className="mb-5 overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-card">
          <div className="border-b border-border px-6 py-4"><h3 className="text-base font-semibold">{s.title}</h3></div>
          <div className="p-6">{s.body}</div>
        </div>
      ))}

      {/* Toolbar + List */}
      <div className="overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-card">
        <div className="flex flex-wrap items-center gap-3 border-b border-border px-5 py-4">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar…"
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/25"
            />
          </div>
          <span className="text-xs text-muted-foreground">{filtered.length} de {items.length}</span>
          <button onClick={openCreate} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-3 text-xs font-semibold text-primary transition hover:bg-primary/15">
            <Plus className="h-3.5 w-3.5" /> Adicionar
          </button>
        </div>

        {filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center gap-2 px-6 py-16 text-center">
            <div className="grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><Icon className="h-6 w-6" /></div>
            <p className="text-sm font-medium">Nenhum registro encontrado</p>
            <p className="text-xs text-muted-foreground">Crie o primeiro registro para começar.</p>
            <button onClick={openCreate} className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground transition hover:opacity-90">
              <Plus className="h-3.5 w-3.5" /> {ctaLabel}
            </button>
          </div>
        ) : (
          <ul className="divide-y divide-border">
            {filtered.map((it) => (
              <li key={it.id} className="group flex items-center gap-4 px-5 py-4 transition hover:bg-surface-2/60">
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h4 className="truncate text-sm font-semibold">{it.title}</h4>
                    {it.status && <StatusPill tone={it.tone ?? "neutral"}>{it.status}</StatusPill>}
                  </div>
                  {it.subtitle && <p className="mt-0.5 truncate text-xs text-muted-foreground">{it.subtitle}</p>}
                </div>
                {it.meta && <div className="hidden text-xs font-semibold tabular-nums text-muted-foreground md:block">{it.meta}</div>}
                <div className="flex items-center gap-1 opacity-0 transition group-hover:opacity-100">
                  <button onClick={() => openEdit(it)} title="Editar" className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-surface-3 hover:text-foreground">
                    <Pencil className="h-3.5 w-3.5" />
                  </button>
                  <button onClick={() => remove(it.id)} title="Excluir" className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground transition hover:bg-destructive/15 hover:text-destructive">
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
                <ArrowUpRight className="hidden h-4 w-4 text-muted-foreground transition group-hover:translate-x-0.5 group-hover:text-primary md:block" />
              </li>
            ))}
          </ul>
        )}
      </div>

      {dialogOpen && editing && (
        <ItemDialog
          title={editing.id ? "Editar registro" : ctaLabel}
          draft={editing}
          onChange={setEditing}
          onCancel={() => { setDialogOpen(false); setEditing(null); }}
          onSave={() => save(editing)}
        />
      )}
    </AppShell>
  );
}

function ItemDialog({
  title, draft, onChange, onCancel, onSave,
}: { title: string; draft: StubItem; onChange: (d: StubItem) => void; onCancel: () => void; onSave: () => void }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm" onClick={onCancel}>
      <div className="w-full max-w-md overflow-hidden rounded-2xl border border-border bg-card shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold">{title}</h3>
          <button onClick={onCancel} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-surface-2 hover:text-foreground"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <Field label="Título">
            <input value={draft.title} onChange={(e) => onChange({ ...draft, title: e.target.value })} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" autoFocus />
          </Field>
          <Field label="Descrição">
            <input value={draft.subtitle ?? ""} onChange={(e) => onChange({ ...draft, subtitle: e.target.value })} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Meta / Valor">
              <input value={draft.meta ?? ""} onChange={(e) => onChange({ ...draft, meta: e.target.value })} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" />
            </Field>
            <Field label="Status">
              <input value={draft.status ?? ""} onChange={(e) => onChange({ ...draft, status: e.target.value })} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" />
            </Field>
          </div>
          <Field label="Tom">
            <div className="flex flex-wrap gap-1.5">
              {TONES.map((t) => (
                <button key={t} type="button" onClick={() => onChange({ ...draft, tone: t })} className={`rounded-full px-3 py-1 text-[11px] font-semibold capitalize transition ${draft.tone === t ? "bg-primary text-primary-foreground" : "border border-border bg-surface-2 text-muted-foreground hover:text-foreground"}`}>
                  {t}
                </button>
              ))}
            </div>
          </Field>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-2/50 px-5 py-3">
          <button onClick={onCancel} className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold hover:bg-surface-2">Cancelar</button>
          <button onClick={onSave} className="h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground transition hover:opacity-90">Salvar</button>
        </div>
      </div>
    </div>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
