import { pageHead } from "@/lib/page-head";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { AppShell, PrimaryButton } from "@/components/app-shell";
import { AlignPanel, AlignPanelFooter } from "@/components/align-panel";
import { useCompanies, useUpsertCompany, useDeleteCompany, type CompanyRow } from "@/hooks/use-companies";
import { useContacts } from "@/hooks/use-contacts";
import { useDeals } from "@/hooks/use-deals";
import { useMyCommercialRole } from "@/hooks/use-commercial-role";
import { useRealtimeSync } from "@/hooks/use-realtime";
import { formatBRL } from "@/lib/mock-data";
import { Building2, Plus, Pencil, Trash2, Search, Users, Briefcase } from "@/components/ui/icons";
import { toast } from "sonner";

export const Route = createFileRoute("/empresas")({
  head: () => pageHead("Empresas"),
  component: EmpresasPage,
});

function EmpresasPage() {
  useRealtimeSync([{ table: "companies", queryKeys: [["companies"]] }]);
  const { data: companies = [], isLoading } = useCompanies();
  const { data: contacts = [] } = useContacts();
  const { data: deals = [] } = useDeals();
  const upsert = useUpsertCompany();
  const del = useDeleteCompany();
  const { canEdit, canDelete } = useMyCommercialRole();
  const [query, setQuery] = useState("");
  const [editing, setEditing] = useState<Partial<CompanyRow> | null>(null);

  const filtered = useMemo(() => companies.filter((c) =>
    !query || c.nome.toLowerCase().includes(query.toLowerCase()) ||
    (c.segmento ?? "").toLowerCase().includes(query.toLowerCase()) ||
    (c.cnpj ?? "").includes(query)
  ), [companies, query]);

  const contactsByCompany = useMemo(() => {
    const m = new Map<string, number>();
    contacts.forEach((c) => { if (c.company_id) m.set(c.company_id, (m.get(c.company_id) ?? 0) + 1); });
    return m;
  }, [contacts]);

  const totalDealsValue = deals.reduce((a, d) => a + Number(d.valor || 0), 0);
  const segmentos = new Set(companies.map((c) => c.segmento).filter(Boolean)).size;

  return (
    <AppShell
      title="Empresas"
      subtitle={`${companies.length} cadastradas · ${contacts.length} contatos vinculados`}
      action={canEdit ? <PrimaryButton icon={Plus} onClick={() => setEditing({ nome: "" })}>Nova empresa</PrimaryButton> : null}
    >
      <div className="mb-5 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
        <Kpi label="Total" value={String(companies.length)} icon={Building2} />
        <Kpi label="Contatos vinculados" value={String(contacts.length)} icon={Users} />
        <Kpi label="Segmentos" value={String(segmentos)} />
        <Kpi label="Pipeline associado" value={formatBRL(totalDealsValue)} icon={Briefcase} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-border bg-surface-1 shadow-card">
        <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar por nome, CNPJ ou segmento…"
              className="h-9 w-full rounded-lg border border-border bg-background pl-9 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/25" />
          </div>
          <span className="text-xs text-muted-foreground">{filtered.length}/{companies.length}</span>
        </div>

        {isLoading ? (
          <div className="px-6 py-12 text-center text-sm text-muted-foreground">Carregando…</div>
        ) : filtered.length === 0 ? (
          <EmptyState icon={Building2} label={companies.length === 0 ? "Nenhuma empresa ainda" : "Nada encontrado"}
            cta={canEdit ? { label: "Cadastrar primeira", onClick: () => setEditing({ nome: "" }) } : undefined} />
        ) : (
          <table className="w-full text-sm">
            <thead className="border-b border-border bg-surface-2/50 text-left text-[11px] uppercase tracking-wider text-muted-foreground">
              <tr>
                <th className="px-5 py-3 font-medium">Nome</th>
                <th className="px-5 py-3 font-medium">Segmento</th>
                <th className="px-5 py-3 font-medium">Localização</th>
                <th className="px-5 py-3 font-medium text-center">Contatos</th>
                <th />
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {filtered.map((c) => (
                <tr key={c.id} className="transition hover:bg-surface-2/40">
                  <td className="px-5 py-3">
                    <div className="font-medium">{c.nome}</div>
                    {c.cnpj && <div className="text-xs text-muted-foreground">{c.cnpj}</div>}
                  </td>
                  <td className="px-5 py-3 text-muted-foreground">{c.segmento ?? "—"}</td>
                  <td className="px-5 py-3 text-muted-foreground">{[c.cidade, c.estado].filter(Boolean).join(" / ") || "—"}</td>
                  <td className="px-5 py-3 text-center tabular-nums">{contactsByCompany.get(c.id) ?? 0}</td>
                  <td className="px-5 py-3">
                    <div className="flex justify-end gap-1">
                      {canEdit && <Button variant="unstyled" size="unstyled" onClick={() => setEditing(c)} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-surface-3 hover:text-foreground"><Pencil className="h-3.5 w-3.5" /></Button>}
                      {canDelete && <Button variant="unstyled" size="unstyled" onClick={() => { if (confirm(`Excluir "${c.nome}"?`)) del.mutate(c.id); }} className="grid h-8 w-8 place-items-center rounded-lg text-muted-foreground hover:bg-destructive/15 hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></Button>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {editing && (
        <CompanyDialog draft={editing} onClose={() => setEditing(null)}
          onSave={(c) => {
            if (!c.nome?.trim()) { toast.error("Informe o nome"); return; }
            upsert.mutate({
              id: c.id, nome: c.nome!, razao_social: c.razao_social ?? null, cnpj: c.cnpj ?? null,
              segmento: c.segmento ?? null, site: c.site ?? null, tamanho: c.tamanho ?? null,
              cidade: c.cidade ?? null, estado: c.estado ?? null, observacoes: c.observacoes ?? null,
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

function CompanyDialog({ draft, onClose, onSave }: { draft: Partial<CompanyRow>; onClose: () => void; onSave: (c: Partial<CompanyRow>) => void }) {
  const [c, setC] = useState(draft);
  return (
    <AlignPanel
      open
      onClose={onClose}
      eyebrow="Empresa"
      title={c.id ? "Editar empresa" : "Nova empresa"}
      widthClass="md:max-w-[560px]"
      footer={
        <AlignPanelFooter
          secondary={{ label: "Cancelar", onClick: onClose }}
          primary={{ label: "Salvar", onClick: () => onSave(c) }}
        />
      }
    >
      <div className="space-y-3">
        <L label="Nome"><Inp value={c.nome ?? ""} onChange={(v) => setC({ ...c, nome: v })} autoFocus /></L>
        <div className="grid grid-cols-2 gap-3">
          <L label="CNPJ"><Inp value={c.cnpj ?? ""} onChange={(v) => setC({ ...c, cnpj: v })} /></L>
          <L label="Segmento"><Inp value={c.segmento ?? ""} onChange={(v) => setC({ ...c, segmento: v })} /></L>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <L label="Cidade"><Inp value={c.cidade ?? ""} onChange={(v) => setC({ ...c, cidade: v })} /></L>
          <L label="Estado"><Inp value={c.estado ?? ""} onChange={(v) => setC({ ...c, estado: v })} /></L>
        </div>
        <L label="Site"><Inp value={c.site ?? ""} onChange={(v) => setC({ ...c, site: v })} /></L>
        <L label="Observações"><Inp value={c.observacoes ?? ""} onChange={(v) => setC({ ...c, observacoes: v })} /></L>
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
