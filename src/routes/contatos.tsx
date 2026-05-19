import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, PrimaryButton } from "@/components/app-shell";
import { useContacts, useUpsertContact, useDeleteContact, type ContactRow } from "@/hooks/use-contacts";
import { useCompanies } from "@/hooks/use-companies";
import { useMyCommercialRole } from "@/hooks/use-commercial-role";
import { useRealtimeSync } from "@/hooks/use-realtime";
import { Users, Plus, Pencil, Trash2, Search, X, Mail, Phone, Building2 } from "lucide-react";
import { toast } from "sonner";

export const Route = createFileRoute("/contatos")({
  head: () => ({ meta: [{ title: "Contatos — Launcher CRM" }] }),
  component: ContatosPage,
});

function ContatosPage() {
  useRealtimeSync([{ table: "contacts", queryKeys: [["contacts"]] }]);
  const { data: contacts = [], isLoading } = useContacts();
  const { data: companies = [] } = useCompanies();
  const upsert = useUpsertContact();
  const del = useDeleteContact();
  const { canEdit, canDelete } = useMyCommercialRole();
  const [query, setQuery] = useState("");
  const [companyFilter, setCompanyFilter] = useState<string>("todos");
  const [editing, setEditing] = useState<Partial<ContactRow> | null>(null);

  const companyMap = useMemo(() => new Map(companies.map((c) => [c.id, c.nome])), [companies]);

  const filtered = useMemo(() => contacts.filter((c) => {
    if (companyFilter !== "todos" && c.company_id !== companyFilter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return c.nome.toLowerCase().includes(q) || (c.email ?? "").toLowerCase().includes(q) ||
           (c.cargo ?? "").toLowerCase().includes(q) || (c.whatsapp ?? "").includes(query);
  }), [contacts, query, companyFilter]);

  const comEmail = contacts.filter((c) => !!c.email).length;
  const comWhats = contacts.filter((c) => !!c.whatsapp).length;
  const vinculados = contacts.filter((c) => !!c.company_id).length;

  return (
    <AppShell
      title="Contatos"
      subtitle={`${contacts.length} pessoas · ${vinculados} vinculados a empresas`}
      action={canEdit ? <PrimaryButton icon={Plus} onClick={() => setEditing({ nome: "" })}>Novo contato</PrimaryButton> : null}
    >
      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total" value={String(contacts.length)} icon={Users} />
        <Kpi label="Com email" value={String(comEmail)} icon={Mail} />
        <Kpi label="Com WhatsApp" value={String(comWhats)} icon={Phone} />
        <Kpi label="Vinculados" value={String(vinculados)} icon={Building2} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, email, cargo…"
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" />
          </div>
          <select value={companyFilter} onChange={(e) => setCompanyFilter(e.target.value)}
            className="h-9 rounded-lg border border-border bg-background px-3 text-sm">
            <option value="todos">Todas as empresas</option>
            {companies.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
          <span className="text-xs text-muted-foreground">{filtered.length}/{contacts.length}</span>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Users} label={contacts.length === 0 ? "Nenhum contato ainda" : "Nada encontrado"}
            cta={canEdit ? { label: "Cadastrar primeiro", onClick: () => setEditing({ nome: "" }) } : undefined} />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-2/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">Cargo</th>
                <th className="px-5 py-3 font-medium">Empresa</th>
                <th className="px-5 py-3 font-medium">Contato</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <tr key={c.id} className="transition hover:bg-surface-2/40">
                  <td className="px-5 py-3 font-medium">{c.nome}</td>
                  <td className="px-5 py-3 text-muted-foreground">{c.cargo ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{c.company_id ? companyMap.get(c.company_id) ?? "—" : "—"}</td>
                  <td className="px-5 py-3 text-xs text-muted-foreground">
                    {c.email && <div>{c.email}</div>}
                    {c.whatsapp && <div>{c.whatsapp}</div>}
                    {!c.email && !c.whatsapp && "—"}
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      {canEdit && <button onClick={() => setEditing(c)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-surface-3 hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></button>}
                      {canDelete && <button onClick={() => { if (confirm(`Excluir "${c.nome}"?`)) del.mutate(c.id); }} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/15 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <ContactDialog draft={editing} companies={companies} onClose={() => setEditing(null)}
          onSave={(c) => {
            if (!c.nome?.trim()) { toast.error("Informe o nome"); return; }
            upsert.mutate({
              id: c.id, nome: c.nome!, cargo: c.cargo ?? null, email: c.email ?? null,
              whatsapp: c.whatsapp ?? null, telefone: c.telefone ?? null,
              company_id: c.company_id || null, observacoes: c.observacoes ?? null,
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
      {cta && <button onClick={cta.onClick} className="mt-2 inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground hover:opacity-90"><Plus className="h-3.5 w-3.5" /> {cta.label}</button>}
    </div>
  );
}

function ContactDialog({ draft, companies, onClose, onSave }: { draft: Partial<ContactRow>; companies: { id: string; nome: string }[]; onClose: () => void; onSave: (c: Partial<ContactRow>) => void }) {
  const [c, setC] = useState(draft);
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/50 p-4 backdrop-blur-sm" onClick={onClose}>
      <div className="w-full max-w-lg overflow-hidden rounded-2xl border border-border bg-card shadow-elevated" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <h3 className="text-sm font-semibold">{c.id ? "Editar contato" : "Novo contato"}</h3>
          <button onClick={onClose} className="grid h-7 w-7 place-items-center rounded-lg text-muted-foreground hover:bg-surface-2"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 px-5 py-4">
          <L label="Nome"><Inp value={c.nome ?? ""} onChange={(v) => setC({ ...c, nome: v })} autoFocus /></L>
          <div className="grid grid-cols-2 gap-3">
            <L label="Cargo"><Inp value={c.cargo ?? ""} onChange={(v) => setC({ ...c, cargo: v })} /></L>
            <L label="Empresa">
              <select value={c.company_id ?? ""} onChange={(e) => setC({ ...c, company_id: e.target.value || null })}
                className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm">
                <option value="">— Nenhuma —</option>
                {companies.map((co) => <option key={co.id} value={co.id}>{co.nome}</option>)}
              </select>
            </L>
          </div>
          <L label="Email"><Inp type="email" value={c.email ?? ""} onChange={(v) => setC({ ...c, email: v })} /></L>
          <div className="grid grid-cols-2 gap-3">
            <L label="WhatsApp"><Inp value={c.whatsapp ?? ""} onChange={(v) => setC({ ...c, whatsapp: v })} /></L>
            <L label="Telefone"><Inp value={c.telefone ?? ""} onChange={(v) => setC({ ...c, telefone: v })} /></L>
          </div>
        </div>
        <div className="flex items-center justify-end gap-2 border-t border-border bg-surface-2/50 px-5 py-3">
          <button onClick={onClose} className="h-9 rounded-lg border border-border bg-background px-3 text-xs font-semibold hover:bg-surface-2">Cancelar</button>
          <button onClick={() => onSave(c)} className="h-9 rounded-lg bg-primary px-4 text-xs font-semibold text-primary-foreground hover:opacity-90">Salvar</button>
        </div>
      </div>
    </div>
  );
}

function L({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</span>{children}</label>;
}
function Inp({ onChange, ...rest }: Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange"> & { onChange: (v: string) => void }) {
  return <input {...rest} onChange={(e) => onChange(e.target.value)} className="h-9 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" />;
}
