import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/auth-context";
import { useTenant } from "@/contexts/tenant-context";
import {
  Loader2, Shield, Building2, Users, DollarSign, TrendingUp, Search, Plus,
  CheckCircle2, XCircle, PauseCircle, Sparkles, ArrowLeft, Trash2, Edit3,
} from "lucide-react";
import { toast } from "sonner";
import { Skeleton } from "@/components/ui/skeleton";
import { AlignPanel, AlignPanelFooter } from "@/components/align-panel";

export const Route = createFileRoute("/super-admin")({
  component: SuperAdminPage,
});

type TenantStatus = "trial" | "ativo" | "suspenso" | "cancelado";

type Plan = {
  id: string;
  nome: string;
  slug: string;
  preco_mensal: number;
  max_leads: number | null;
  max_usuarios: number | null;
  ativo: boolean;
};

type TenantFull = {
  id: string;
  nome: string;
  slug: string;
  status: TenantStatus;
  plan_id: string | null;
  responsavel: string | null;
  email_principal: string | null;
  whatsapp: string | null;
  trial_ate: string | null;
  proximo_vencimento: string | null;
  created_at: string;
};

const STATUS_META: Record<TenantStatus, { label: string; tone: string; icon: any }> = {
  trial: { label: "Trial", tone: "bg-[oklch(0.7_0.12_220)/0.15] text-[oklch(0.55_0.13_220)] dark:text-[oklch(0.78_0.13_220)]", icon: Sparkles },
  ativo: { label: "Ativo", tone: "bg-success/15 text-success", icon: CheckCircle2 },
  suspenso: { label: "Suspenso", tone: "bg-warning/15 text-warning", icon: PauseCircle },
  cancelado: { label: "Cancelado", tone: "bg-destructive/15 text-destructive", icon: XCircle },
};

function SuperAdminPage() {
  const { user, loading: authLoading, signOut } = useAuth();
  const { isSuperAdmin, loading: tenantLoading } = useTenant();
  const navigate = useNavigate();
  const qc = useQueryClient();

  useEffect(() => {
    if (!authLoading && !user) navigate({ to: "/auth" });
  }, [authLoading, user, navigate]);

  useEffect(() => {
    if (!tenantLoading && user && !isSuperAdmin) navigate({ to: "/onboarding" });
  }, [tenantLoading, isSuperAdmin, user, navigate]);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | TenantStatus>("all");
  const [editing, setEditing] = useState<TenantFull | null>(null);
  const [creating, setCreating] = useState(false);

  const tenantsQ = useQuery({
    queryKey: ["sa-tenants"],
    enabled: !!user && isSuperAdmin,
    queryFn: async (): Promise<TenantFull[]> => {
      const { data, error } = await supabase
        .from("tenants")
        .select("id,nome,slug,status,plan_id,responsavel,email_principal,whatsapp,trial_ate,proximo_vencimento,created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as TenantFull[];
    },
  });

  const plansQ = useQuery({
    queryKey: ["sa-plans"],
    enabled: !!user && isSuperAdmin,
    queryFn: async (): Promise<Plan[]> => {
      const { data, error } = await supabase
        .from("plans")
        .select("id,nome,slug,preco_mensal,max_leads,max_usuarios,ativo")
        .order("ordem", { ascending: true });
      if (error) throw error;
      return (data ?? []) as Plan[];
    },
  });

  const subsQ = useQuery({
    queryKey: ["sa-subscriptions"],
    enabled: !!user && isSuperAdmin,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("subscriptions")
        .select("tenant_id,plan_id,status,valor");
      if (error) throw error;
      return data ?? [];
    },
  });

  const tenants = tenantsQ.data ?? [];
  const plans = plansQ.data ?? [];
  const subs = subsQ.data ?? [];

  const planById = useMemo(() => Object.fromEntries(plans.map((p) => [p.id, p])), [plans]);

  // KPIs
  const total = tenants.length;
  const ativos = tenants.filter((t) => t.status === "ativo").length;
  const trial = tenants.filter((t) => t.status === "trial").length;
  const mrr = subs.filter((s) => s.status === "ativo").reduce((sum, s) => sum + Number(s.valor || 0), 0);

  const filtered = tenants.filter((t) => {
    if (statusFilter !== "all" && t.status !== statusFilter) return false;
    if (search) {
      const q = search.toLowerCase();
      return (
        t.nome.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q) ||
        (t.email_principal ?? "").toLowerCase().includes(q) ||
        (t.responsavel ?? "").toLowerCase().includes(q)
      );
    }
    return true;
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: TenantStatus }) => {
      const { error } = await supabase.from("tenants").update({ status }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["sa-tenants"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteTenant = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("tenants").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Empresa excluída");
      qc.invalidateQueries({ queryKey: ["sa-tenants"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (authLoading || tenantLoading || !user) {
    return (
      <div className="grid min-h-screen place-items-center bg-background">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
      </div>
    );
  }
  if (!isSuperAdmin) return null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="sticky top-0 z-20 border-b border-border bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-5 md:px-8">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-[oklch(0.55_0.16_35)] shadow-glow">
            <Shield className="h-4 w-4 text-primary-foreground" />
          </div>
          <div>
            <div className="text-sm font-semibold leading-tight">Super Admin</div>
            <div className="text-[11px] text-muted-foreground leading-tight">Gestão SaaS multi-tenant</div>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <Link to="/onboarding" className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-border bg-surface-1 px-3 text-xs font-medium text-muted-foreground transition hover:text-foreground">
              <ArrowLeft className="h-3.5 w-3.5" /> Onboarding
            </Link>
            <button onClick={() => signOut()} className="inline-flex h-9 items-center rounded-lg border border-border bg-surface-1 px-3 text-xs font-medium text-muted-foreground transition hover:text-foreground">
              Sair
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-5 py-8 md:px-8">
        <div className="mb-6">
          <h1 className="text-3xl font-semibold tracking-tight md:text-4xl">Painel Super Admin</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">Visão completa do seu SaaS — tenants, planos e receita recorrente.</p>
        </div>

        {/* KPIs */}
        <div className="grid gap-4 md:grid-cols-4">
          <KpiCard icon={Building2} label="Total de empresas" value={total.toString()} tone="primary" />
          <KpiCard icon={CheckCircle2} label="Ativas" value={ativos.toString()} tone="success" />
          <KpiCard icon={Sparkles} label="Em trial" value={trial.toString()} tone="info" />
          <KpiCard icon={DollarSign} label="MRR" value={brl(mrr)} tone="primary" />
        </div>

        {/* Planos */}
        <section className="mt-10">
          <div className="mb-3 flex items-center justify-between">
            <h2 className="text-lg font-semibold tracking-tight">Planos disponíveis</h2>
            <span className="text-xs text-muted-foreground">{plans.length} planos</span>
          </div>
          <div className="grid gap-3 md:grid-cols-3">
            {plans.map((p) => (
              <div key={p.id} className="rounded-xl border border-border bg-surface-1 p-5 shadow-card">
                <div className="flex items-start justify-between">
                  <div>
                    <div className="text-sm font-semibold">{p.nome}</div>
                    <div className="text-[11px] text-muted-foreground">{p.slug}</div>
                  </div>
                  {p.ativo ? (
                    <span className="rounded-full bg-success/15 px-2 py-0.5 text-[10px] font-medium text-success">Ativo</span>
                  ) : (
                    <span className="rounded-full bg-surface-3 px-2 py-0.5 text-[10px] font-medium text-muted-foreground">Inativo</span>
                  )}
                </div>
                <div className="mt-3 text-2xl font-semibold">{brl(Number(p.preco_mensal))}<span className="text-xs font-normal text-muted-foreground">/mês</span></div>
                <div className="mt-2 flex flex-wrap gap-2 text-[11px] text-muted-foreground">
                  <span>{p.max_leads ? `${p.max_leads} leads` : "Leads ilimitados"}</span>
                  <span>•</span>
                  <span>{p.max_usuarios ? `${p.max_usuarios} usuários` : "Usuários ilimitados"}</span>
                </div>
              </div>
            ))}
            {plans.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed border-border p-6 text-center text-sm text-muted-foreground">
                Nenhum plano cadastrado ainda.
              </div>
            )}
          </div>
        </section>

        {/* Tenants */}
        <section className="mt-10">
          <div className="mb-3 flex flex-wrap items-center gap-3">
            <h2 className="text-lg font-semibold tracking-tight">Empresas (Tenants)</h2>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
                <input
                  value={search} onChange={(e) => setSearch(e.target.value)}
                  placeholder="Buscar..."
                  className="h-9 w-56 rounded-lg border border-border bg-surface-1 pl-9 pr-3 text-sm focus:border-primary/60 focus:outline-none"
                />
              </div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="h-9 rounded-lg border border-border bg-surface-1 px-3 text-sm focus:border-primary/60 focus:outline-none"
              >
                <option value="all">Todos status</option>
                <option value="trial">Trial</option>
                <option value="ativo">Ativo</option>
                <option value="suspenso">Suspenso</option>
                <option value="cancelado">Cancelado</option>
              </select>
              <button
                onClick={() => setCreating(true)}
                className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground shadow-glow transition hover:brightness-110"
              >
                <Plus className="h-3.5 w-3.5" /> Nova empresa
              </button>
            </div>
          </div>

          <div className="overflow-hidden rounded-xl border border-border bg-surface-1 shadow-card">
            <table className="w-full text-sm">
              <thead className="bg-surface-2 text-[11px] uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3 text-left font-medium">Empresa</th>
                  <th className="px-4 py-3 text-left font-medium">Responsável</th>
                  <th className="px-4 py-3 text-left font-medium">Plano</th>
                  <th className="px-4 py-3 text-left font-medium">Status</th>
                  <th className="px-4 py-3 text-left font-medium">Vencimento</th>
                  <th className="px-4 py-3 text-right font-medium">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tenantsQ.isLoading ? (
                  Array.from({ length: 4 }).map((_, i) => (
                    <tr key={i} className="border-b border-border last:border-0">
                      <td className="px-4 py-3"><div className="space-y-2"><Skeleton className="h-3 w-32" /><Skeleton className="h-2.5 w-24" /></div></td>
                      <td className="px-4 py-3"><div className="space-y-2"><Skeleton className="h-3 w-28" /><Skeleton className="h-2.5 w-36" /></div></td>
                      <td className="px-4 py-3"><Skeleton className="h-3 w-20" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-5 w-16 rounded-full" /></td>
                      <td className="px-4 py-3"><Skeleton className="h-3 w-20" /></td>
                      <td className="px-4 py-3"><div className="flex justify-end gap-1"><Skeleton className="h-7 w-7 rounded-md" /><Skeleton className="h-7 w-7 rounded-md" /><Skeleton className="h-7 w-7 rounded-md" /></div></td>
                    </tr>
                  ))
                ) : filtered.length === 0 ? (
                  <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-muted-foreground">Nenhuma empresa encontrada.</td></tr>
                ) : filtered.map((t) => {
                  const meta = STATUS_META[t.status];
                  const Icon = meta.icon;
                  const plan = t.plan_id ? planById[t.plan_id] : null;
                  return (
                    <tr key={t.id} className="transition hover:bg-surface-2/50">
                      <td className="px-4 py-3">
                        <div className="font-medium">{t.nome}</div>
                        <div className="text-[11px] text-muted-foreground font-mono">/t/{t.slug}</div>
                      </td>
                      <td className="px-4 py-3 text-muted-foreground">
                        <div className="text-sm">{t.responsavel ?? "—"}</div>
                        <div className="text-[11px]">{t.email_principal ?? ""}</div>
                      </td>
                      <td className="px-4 py-3 text-sm">{plan?.nome ?? "—"}</td>
                      <td className="px-4 py-3">
                        <span className={`inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium ${meta.tone}`}>
                          <Icon className="h-3 w-3" /> {meta.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-sm text-muted-foreground">
                        {t.proximo_vencimento ?? t.trial_ate ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center justify-end gap-1">
                          {t.status !== "ativo" && (
                            <button onClick={() => updateStatus.mutate({ id: t.id, status: "ativo" })} title="Ativar"
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-success/10 hover:text-success">
                              <CheckCircle2 className="h-4 w-4" />
                            </button>
                          )}
                          {t.status !== "suspenso" && (
                            <button onClick={() => updateStatus.mutate({ id: t.id, status: "suspenso" })} title="Suspender"
                              className="rounded-md p-1.5 text-muted-foreground hover:bg-warning/10 hover:text-warning">
                              <PauseCircle className="h-4 w-4" />
                            </button>
                          )}
                          <button onClick={() => setEditing(t)} title="Editar"
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-surface-3 hover:text-foreground">
                            <Edit3 className="h-4 w-4" />
                          </button>
                          <button onClick={() => {
                            if (confirm(`Excluir "${t.nome}"? Todos os dados desta empresa serão removidos.`)) deleteTenant.mutate(t.id);
                          }} title="Excluir"
                            className="rounded-md p-1.5 text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </main>

      {(editing || creating) && (
        <TenantFormDialog
          tenant={editing}
          plans={plans}
          onClose={() => { setEditing(null); setCreating(false); }}
          onSaved={() => { setEditing(null); setCreating(false); qc.invalidateQueries({ queryKey: ["sa-tenants"] }); }}
        />
      )}
    </div>
  );
}

function KpiCard({ icon: Icon, label, value, tone }: { icon: any; label: string; value: string; tone: "primary" | "success" | "info" }) {
  const tones: Record<string, string> = {
    primary: "from-primary/20 to-primary/5 text-primary",
    success: "from-success/20 to-success/5 text-success",
    info: "from-[oklch(0.7_0.12_220)/0.2] to-[oklch(0.7_0.12_220)/0.05] text-[oklch(0.55_0.13_220)] dark:text-[oklch(0.78_0.13_220)]",
  };
  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-surface-1 p-5 shadow-card">
      <div className={`absolute inset-0 bg-gradient-to-br opacity-60 ${tones[tone]}`} style={{ maskImage: "radial-gradient(120% 60% at 100% 0%, black, transparent)" }} />
      <div className="relative">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">{label}</span>
          <Icon className={`h-4 w-4 ${tones[tone].split(" ").pop()}`} />
        </div>
        <div className="mt-3 text-3xl font-semibold tracking-tight">{value}</div>
      </div>
    </div>
  );
}

function TenantFormDialog({ tenant, plans, onClose, onSaved }: {
  tenant: TenantFull | null; plans: Plan[]; onClose: () => void; onSaved: () => void;
}) {
  const isNew = !tenant;
  const [nome, setNome] = useState(tenant?.nome ?? "");
  const [slug, setSlug] = useState(tenant?.slug ?? "");
  const [responsavel, setResponsavel] = useState(tenant?.responsavel ?? "");
  const [email, setEmail] = useState(tenant?.email_principal ?? "");
  const [whatsapp, setWhatsapp] = useState(tenant?.whatsapp ?? "");
  const [planId, setPlanId] = useState(tenant?.plan_id ?? "");
  const [status, setStatus] = useState<TenantStatus>(tenant?.status ?? "trial");
  const [busy, setBusy] = useState(false);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      if (isNew) {
        const finalSlug = (slug || nome).toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "")
          .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 40);
        const { error } = await supabase.from("tenants").insert({
          nome, slug: finalSlug, responsavel: responsavel || null, email_principal: email || null,
          whatsapp: whatsapp || null, plan_id: planId || null, status,
        });
        if (error) throw error;
        toast.success("Empresa criada");
      } else {
        const { error } = await supabase.from("tenants").update({
          nome, slug, responsavel: responsavel || null, email_principal: email || null,
          whatsapp: whatsapp || null, plan_id: planId || null, status,
        }).eq("id", tenant!.id);
        if (error) throw error;
        toast.success("Empresa atualizada");
      }
      onSaved();
    } catch (err: any) {
      toast.error(err.message ?? "Erro ao salvar");
    } finally {
      setBusy(false);
    }
  }

  return (
    <AlignPanel
      open
      onClose={onClose}
      eyebrow="Tenant"
      title={isNew ? "Nova empresa" : "Editar empresa"}
      widthClass="md:max-w-[560px]"
      footer={
        <AlignPanelFooter
          secondary={{ label: "Cancelar", onClick: onClose }}
          primary={{
            label: "Salvar",
            onClick: () => document.getElementById("tenant-form")?.dispatchEvent(new Event("submit", { cancelable: true, bubbles: true })),
            disabled: !nome.trim(),
            loading: busy,
          }}
        />
      }
    >
      <form id="tenant-form" onSubmit={save} className="space-y-3">
        <Field label="Nome *">
          <input required value={nome} onChange={(e) => setNome(e.target.value)} className={inputCls} />
        </Field>
        {!isNew && (
          <Field label="Slug">
            <input value={slug} onChange={(e) => setSlug(e.target.value)} className={`${inputCls} font-mono`} />
          </Field>
        )}
        <div className="grid grid-cols-2 gap-3">
          <Field label="Responsável"><input value={responsavel} onChange={(e) => setResponsavel(e.target.value)} className={inputCls} /></Field>
          <Field label="Email"><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} className={inputCls} /></Field>
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="WhatsApp"><input value={whatsapp} onChange={(e) => setWhatsapp(e.target.value)} className={inputCls} /></Field>
          <Field label="Status">
            <select value={status} onChange={(e) => setStatus(e.target.value as TenantStatus)} className={inputCls}>
              <option value="trial">Trial</option>
              <option value="ativo">Ativo</option>
              <option value="suspenso">Suspenso</option>
              <option value="cancelado">Cancelado</option>
            </select>
          </Field>
        </div>
        <Field label="Plano">
          <select value={planId} onChange={(e) => setPlanId(e.target.value)} className={inputCls}>
            <option value="">— Sem plano —</option>
            {plans.map((p) => <option key={p.id} value={p.id}>{p.nome} — {brl(Number(p.preco_mensal))}/mês</option>)}
          </select>
        </Field>
      </form>
    </AlignPanel>
  );
}

const inputCls = "h-10 w-full rounded-lg border border-border bg-surface-2 px-3 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20";

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <label className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</label>
      <div className="mt-1">{children}</div>
    </div>
  );
}

function brl(n: number) {
  return n.toLocaleString("pt-BR", { style: "currency", currency: "BRL", maximumFractionDigits: 0 });
}
