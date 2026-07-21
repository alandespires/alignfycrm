import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState, type FormEvent } from "react";
import { AppShell, PrimaryButton, StatusPill } from "@/components/app-shell";
import { RealtimeBadge } from "@/components/realtime-badge";
import { useRealtimeSync } from "@/hooks/use-realtime";
import { ClientDetailDrawer } from "@/components/client-detail-drawer";
import { useClients, useCreateClient, useDeleteClient, type ClientRow } from "@/hooks/use-clients";
import { Plus, Building2, Mail, Phone, Loader2, Inbox, Trash2, X, Search } from "lucide-react";
import { CardGridSkeleton } from "@/components/skeletons";
import { WhatsAppContactLink } from "@/components/whatsapp-contact-link";

export const Route = createFileRoute("/clientes")({
  head: () => ({ meta: [{ title: "Clientes — Align CRM" }] }),
  component: ClientesPage,
});

function formatBRL(v: number) {
  return v.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}

type ClientFilter = "todos" | "com_contrato" | "sem_contrato";

function ClientesPage() {
  const realtimeStatus = useRealtimeSync([
    { table: "clients", queryKeys: [["clients"]] },
    { table: "activities", queryKeys: [["activities"], ["client-activities"]] },
    { table: "deals", queryKeys: [["deals"], ["client-deals"]] },
  ]);
  const { data: clients = [], isLoading } = useClients();
  const create = useCreateClient();
  const del = useDeleteClient();
  const [selected, setSelected] = useState<ClientRow | null>(null);

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<ClientFilter>("todos");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return clients.filter((c) => {
      if (filter === "com_contrato" && !(Number(c.contrato_valor ?? 0) > 0)) return false;
      if (filter === "sem_contrato" && Number(c.contrato_valor ?? 0) > 0) return false;
      if (!q) return true;
      return [c.nome, c.empresa, c.email, c.whatsapp].some((v) => (v ?? "").toLowerCase().includes(q));
    });
  }, [clients, query, filter]);

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ nome: "", empresa: "", email: "", whatsapp: "", contrato_valor: "", observacoes: "" });

  function set<K extends keyof typeof form>(k: K, v: string) { setForm((p) => ({ ...p, [k]: v })); }

  async function submit(e: FormEvent) {
    e.preventDefault();
    await create.mutateAsync({
      nome: form.nome,
      empresa: form.empresa || undefined,
      email: form.email || undefined,
      whatsapp: form.whatsapp || undefined,
      contrato_valor: form.contrato_valor ? Number(form.contrato_valor) : undefined,
      observacoes: form.observacoes || undefined,
    });
    setForm({ nome: "", empresa: "", email: "", whatsapp: "", contrato_valor: "", observacoes: "" });
    setOpen(false);
  }

  const totalMRR = clients.reduce((a, c) => a + Number(c.contrato_valor ?? 0), 0);

  return (
    <AppShell
      title="Clientes"
      subtitle={`${clients.length} contas ativas · ${formatBRL(totalMRR)} em contratos`}
      action={
        <div className="flex items-center gap-2">
          <RealtimeBadge status={realtimeStatus} />
          <PrimaryButton icon={Plus} onClick={() => setOpen(true)}>Novo cliente</PrimaryButton>
        </div>
      }
    >
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="relative min-w-[220px] max-w-md flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, empresa, email..."
            className="h-10 w-full rounded-lg border border-border bg-surface-1 pl-9 pr-3 text-sm focus:border-primary/60 focus:outline-none" />
        </div>
        <div className="flex rounded-lg border border-border bg-surface-1 p-0.5">
          {([
            { v: "todos", l: "Todos" },
            { v: "com_contrato", l: "Com contrato" },
            { v: "sem_contrato", l: "Sem contrato" },
          ] as { v: ClientFilter; l: string }[]).map((opt) => (
            <button key={opt.v} onClick={() => setFilter(opt.v)}
              className={`h-9 rounded-md px-3 text-xs font-medium transition ${filter === opt.v ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:text-foreground"}`}>
              {opt.l}
            </button>
          ))}
        </div>
        <span className="ml-auto text-xs text-muted-foreground tabular-nums">{filtered.length} de {clients.length}</span>
      </div>

      {isLoading ? (
        <CardGridSkeleton count={6} />
      ) : clients.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-surface-1/40 py-20 text-center">
          <Inbox className="mb-3 h-10 w-10 text-muted-foreground" />
          <h3 className="text-lg font-semibold">Sem clientes ainda</h3>
          <p className="mt-1 max-w-sm text-sm text-muted-foreground">Cadastre seu primeiro cliente ou converta um lead fechado em cliente.</p>
        </div>
      ) : filtered.length === 0 ? (
        <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-surface-1/40 py-16 text-center">
          <p className="text-sm text-muted-foreground">Nenhum cliente bate com os filtros.</p>
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {filtered.map((c: ClientRow) => (
            <div key={c.id} onClick={() => setSelected(c)} className="group cursor-pointer rounded-2xl border border-border bg-surface-2 p-5 shadow-card transition hover:border-primary/40 hover:shadow-elevated">
              <div className="flex items-start justify-between">
                <div className="grid h-11 w-11 place-items-center rounded-xl bg-gradient-to-br from-primary/20 to-surface-3 text-primary">
                  <Building2 className="h-5 w-5" />
                </div>
                <button onClick={(e) => { e.stopPropagation(); if (confirm(`Remover ${c.nome}?`)) del.mutate(c.id); }} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-3 hover:text-destructive">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
              <h3 className="mt-4 text-base font-semibold">{c.empresa || c.nome}</h3>
              <p className="text-xs text-muted-foreground">{c.nome}{c.email ? ` · ${c.email}` : ""}</p>

              <div className="mt-3 flex items-center gap-3 text-muted-foreground">
                {c.email && <a href={`mailto:${c.email}`} className="hover:text-primary"><Mail className="h-3.5 w-3.5" /></a>}
                {c.whatsapp && <WhatsAppContactLink phone={c.whatsapp} className="hover:text-success"><Phone className="h-3.5 w-3.5" /></WhatsAppContactLink>}
              </div>

              <div className="mt-4 grid grid-cols-2 gap-3 border-t border-border pt-4 text-xs">
                <div>
                  <div className="text-muted-foreground">Contrato</div>
                  <div className="mt-0.5 font-semibold tabular-nums">{c.contrato_valor ? formatBRL(Number(c.contrato_valor)) : "—"}</div>
                </div>
                <div>
                  <div className="text-muted-foreground">Início</div>
                  <div className="mt-0.5 font-semibold">{c.contrato_inicio ? new Date(c.contrato_inicio).toLocaleDateString("pt-BR") : "—"}</div>
                </div>
              </div>
              <div className="mt-3"><StatusPill tone="success">Ativo</StatusPill></div>
            </div>
          ))}
        </div>
      )}

      {open && (
        <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={() => setOpen(false)}>
          <form onClick={(e) => e.stopPropagation()} onSubmit={submit} className="w-full max-w-lg rounded-2xl border border-border bg-surface-2 shadow-elevated">
            <div className="flex items-center justify-between border-b border-border p-5">
              <h3 className="text-lg font-semibold">Novo cliente</h3>
              <button type="button" onClick={() => setOpen(false)} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-3"><X className="h-4 w-4" /></button>
            </div>
            <div className="grid grid-cols-2 gap-3 p-5">
              <Field label="Nome do contato *"><input required value={form.nome} onChange={(e) => set("nome", e.target.value)} className={inp} /></Field>
              <Field label="Empresa"><input value={form.empresa} onChange={(e) => set("empresa", e.target.value)} className={inp} /></Field>
              <Field label="Email"><input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inp} /></Field>
              <Field label="WhatsApp"><input value={form.whatsapp} onChange={(e) => set("whatsapp", e.target.value)} className={inp} /></Field>
              <Field label="Valor do contrato (R$)" full>
                <input type="number" min="0" step="100" value={form.contrato_valor} onChange={(e) => set("contrato_valor", e.target.value)} className={inp} />
              </Field>
              <Field label="Observações" full>
                <textarea rows={3} value={form.observacoes} onChange={(e) => set("observacoes", e.target.value)} className={inp + " resize-none"} />
              </Field>
            </div>
            <div className="flex justify-end gap-2 border-t border-border p-4">
              <button type="button" onClick={() => setOpen(false)} className="h-10 rounded-lg border border-border bg-surface-1 px-4 text-sm text-muted-foreground">Cancelar</button>
              <button type="submit" disabled={create.isPending} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
                {create.isPending && <Loader2 className="h-4 w-4 animate-spin" />} Criar cliente
              </button>
            </div>
          </form>
        </div>
      )}

      <ClientDetailDrawer client={selected} onClose={() => setSelected(null)} />
    </AppShell>
  );
}

const inp = "h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20";

function Field({ label, children, full }: { label: string; children: React.ReactNode; full?: boolean }) {
  return (
    <label className={["block", full ? "col-span-2" : ""].join(" ")}>
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
    </label>
  );
}
