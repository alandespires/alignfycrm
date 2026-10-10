import { pageHead } from "@/lib/page-head";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState, type ReactNode } from "react";
import { toast } from "sonner";
import {
  Bell,
  Loader2,
  Mail,
  MessageSquare,
  Save,
  Shield,
  ShoppingBag,
  UserCircle,
  Users,
} from "@/components/ui/icons";
import { AppShell, PrimaryButton, StatusPill } from "@/components/app-shell";
import { useAuth } from "@/contexts/auth-context";
import { useTenant } from "@/contexts/tenant-context";
import { supabase } from "@/integrations/supabase/client";
import {
  useMyCommercialRole,
  useSetCommercialRole,
  useTeam,
  type CommercialRole,
} from "@/hooks/use-commercial-role";
import {
  useSaveTenantSettings,
  useTenantSettings,
  type TenantSettings,
} from "@/hooks/use-tenant-settings";

export const Route = createFileRoute("/configuracoes")({
  head: () => pageHead("Configurações"),
  component: ConfigPage,
});

type TabId = "perfil" | "equipe" | "permissoes" | "vendas" | "marketing" | "integracoes";

const TABS = [
  { id: "perfil", label: "Perfil e preferências", icon: UserCircle },
  { id: "equipe", label: "Usuários e equipe", icon: Users },
  { id: "permissoes", label: "Papéis e permissões", icon: Shield },
  { id: "vendas", label: "Vendas", icon: ShoppingBag },
  { id: "marketing", label: "Marketing", icon: Mail },
  { id: "integracoes", label: "Integrações", icon: MessageSquare },
] satisfies { id: TabId; label: string; icon: typeof UserCircle }[];

function ConfigPage() {
  const [tab, setTab] = useState<TabId>("perfil");
  const { current } = useTenant();
  const settingsQuery = useTenantSettings();
  const save = useSaveTenantSettings();
  const [draft, setDraft] = useState<TenantSettings | null>(null);

  useEffect(() => {
    if (settingsQuery.data) setDraft(settingsQuery.data);
  }, [settingsQuery.data]);

  if (settingsQuery.isLoading || !draft) {
    return <AppShell title="Configurações" subtitle="Perfil pessoal e preferências do workspace"><div className="grid min-h-64 place-items-center"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div></AppShell>;
  }

  const settingsDirty = JSON.stringify(draft) !== JSON.stringify(settingsQuery.data);
  const settingsTab = tab === "perfil" || tab === "vendas" || tab === "marketing";

  return (
    <AppShell
      title="Configurações"
      subtitle="Perfil pessoal e preferências do workspace"
      action={settingsTab ? <PrimaryButton icon={Save} title={current?.role === "tenant_admin" ? undefined : "Somente o administrador do workspace pode salvar estas preferências"} disabled={save.isPending || current?.role !== "tenant_admin" || !settingsDirty} onClick={() => save.mutate(draft)}>{save.isPending ? "Salvando…" : tab === "perfil" ? "Salvar preferências" : "Salvar configurações"}</PrimaryButton> : undefined}
    >
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border border-border bg-surface-2 p-2 shadow-card lg:sticky lg:top-24 lg:self-start">
          {TABS.map((item) => (
            <Button variant="unstyled" size="unstyled"
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              aria-current={tab === item.id ? "page" : undefined}
              className={`flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${tab === item.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-3 hover:text-foreground"}`}
            >
              <item.icon className="h-4 w-4" aria-hidden="true" />
              <span className="font-medium">{item.label}</span>
            </Button>
          ))}
        </aside>

        <div>
          {tab === "perfil" && <ProfileTab settings={draft} onChange={setDraft} />}
          {tab === "equipe" && <TeamTab />}
          {tab === "permissoes" && <PermissionsTab />}
          {tab === "vendas" && <SalesTab settings={draft} onChange={setDraft} />}
          {tab === "marketing" && <MarketingTab settings={draft} onChange={setDraft} />}
          {tab === "integracoes" && <IntegrationsTab />}
        </div>
      </div>
    </AppShell>
  );
}

function ProfileTab({ settings, onChange }: SettingsProps) {
  const { user } = useAuth();
  const [name, setName] = useState(user?.user_metadata?.full_name ?? "");
  const [savingProfile, setSavingProfile] = useState(false);

  async function saveProfile() {
    setSavingProfile(true);
    const { error } = await supabase.auth.updateUser({ data: { full_name: name.trim() } });
    setSavingProfile(false);
    if (error) toast.error(error.message);
    else toast.success("Perfil atualizado");
  }

  return (
    <>
      <Card title="Informações pessoais" description="Dados vinculados à sua conta">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nome completo"><input className={inputClass} value={name} onChange={(event) => setName(event.target.value)} /></Field>
          <Field label="E-mail"><input className={inputClass} value={user?.email ?? ""} disabled /></Field>
        </div>
        <div className="flex justify-end"><PrimaryButton icon={Save} disabled={savingProfile || !name.trim() || name.trim() === (user?.user_metadata?.full_name ?? "")} onClick={saveProfile}>{savingProfile ? "Salvando…" : "Salvar nome"}</PrimaryButton></div>
      </Card>
      <Card title="Preferências">
        <Toggle label="Notificações por e-mail" description="Receber resumo de leads e tarefas" value={settings.preferences.emailNotifications} onChange={(value) => onChange({ ...settings, preferences: { ...settings.preferences, emailNotifications: value } })} />
        <Toggle label="Notificações push do navegador" description="Alertas em tempo real" value={settings.preferences.pushNotifications} onChange={(value) => onChange({ ...settings, preferences: { ...settings.preferences, pushNotifications: value } })} />
        <Toggle label="Modo compacto na lista de leads" value={settings.preferences.compactLeads} onChange={(value) => onChange({ ...settings, preferences: { ...settings.preferences, compactLeads: value } })} />
      </Card>
    </>
  );
}

function TeamTab() {
  const { current } = useTenant();
  const { canEdit } = useMyCommercialRole();
  const { data: team = [], isLoading } = useTeam();
  const setRole = useSetCommercialRole();
  const canManage = current?.role === "tenant_admin" && canEdit;

  const labels: Record<CommercialRole, string> = { admin: "Admin comercial", comercial: "Comercial", visualizador: "Visualizador" };

  return (
    <Card title="Membros do time" description={`Workspace: ${current?.tenant.nome ?? "—"}`}>
      {isLoading ? <div className="flex justify-center py-10"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div> : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface-1">
          {team.map((member) => {
            const name = member.profile?.full_name || member.profile?.email || member.user_id.slice(0, 8);
            const role: CommercialRole = member.commercial_role ?? (member.role === "tenant_admin" ? "admin" : "visualizador");
            return (
              <li key={member.user_id} className="flex flex-wrap items-center gap-3 p-4">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">{name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase()}</div>
                <div className="min-w-0 flex-1"><div className="text-sm font-semibold">{name}</div><div className="text-xs text-muted-foreground">{member.profile?.email ?? "—"}</div></div>
                {canManage ? (
                  <select aria-label={`Papel de ${name}`} value={role} disabled={setRole.isPending} onChange={(event) => setRole.mutate({ userId: member.user_id, role: event.target.value as CommercialRole })} className="h-9 rounded-md border border-border bg-surface-2 px-2 text-xs">
                    {Object.entries(labels).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
                  </select>
                ) : <StatusPill tone="neutral">{labels[role]}</StatusPill>}
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

function PermissionsTab() {
  return (
    <Card title="Papéis comerciais" description="As permissões são fixas e o papel de cada membro é alterado na aba Equipe">
      <div className="grid gap-3 md:grid-cols-3">
        <RoleCard title="Admin comercial" items={["Visualizar", "Criar", "Editar", "Excluir", "Gerenciar papéis"]} />
        <RoleCard title="Comercial" items={["Visualizar", "Criar", "Editar"]} />
        <RoleCard title="Visualizador" items={["Somente visualizar"]} />
      </div>
    </Card>
  );
}

function SalesTab({ settings, onChange }: SettingsProps) {
  return (
    <Card title="Configurações de vendas" description="Regras persistentes do workspace">
      <div className="grid gap-4 md:grid-cols-2">
        <NumberField label="Tempo máximo em estágio (dias)" value={settings.sales.maxStageDays} onChange={(value) => onChange({ ...settings, sales: { ...settings.sales, maxStageDays: value } })} />
        <NumberField label="Validade padrão de propostas (dias)" value={settings.sales.proposalValidityDays} onChange={(value) => onChange({ ...settings, sales: { ...settings.sales, proposalValidityDays: value } })} />
      </div>
      <Toggle label="Atribuir leads automaticamente" value={settings.sales.autoAssignLeads} onChange={(value) => onChange({ ...settings, sales: { ...settings.sales, autoAssignLeads: value } })} />
      <Toggle label="Exigir motivo ao marcar lead como perdido" value={settings.sales.requireLostReason} onChange={(value) => onChange({ ...settings, sales: { ...settings.sales, requireLostReason: value } })} />
    </Card>
  );
}

function MarketingTab({ settings, onChange }: SettingsProps) {
  return (
    <Card title="Configurações de marketing" description="Identidade e preferências de comunicação">
      <div className="grid gap-4 md:grid-cols-2">
        <Field label="Remetente padrão"><input type="email" className={inputClass} value={settings.marketing.senderEmail} onChange={(event) => onChange({ ...settings, marketing: { ...settings.marketing, senderEmail: event.target.value } })} /></Field>
        <Field label="Nome do remetente"><input className={inputClass} value={settings.marketing.senderName} onChange={(event) => onChange({ ...settings, marketing: { ...settings.marketing, senderName: event.target.value } })} /></Field>
      </div>
      <Toggle label="Adicionar link de descadastro" value={settings.marketing.unsubscribeLink} onChange={(value) => onChange({ ...settings, marketing: { ...settings.marketing, unsubscribeLink: value } })} />
      <Toggle label="Enviar relatório semanal" value={settings.marketing.weeklyReport} onChange={(value) => onChange({ ...settings, marketing: { ...settings.marketing, weeklyReport: value } })} />
    </Card>
  );
}

function IntegrationsTab() {
  const items = ["WhatsApp Business", "Google Calendar", "Gmail / Outlook", "Webhooks"];
  return (
    <Card title="Integrações" description="Somente integrações verificadas serão mostradas como conectadas">
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((name) => (
          <div key={name} className="rounded-xl border border-border bg-surface-1 p-4">
            <div className="flex items-center justify-between gap-3"><div className="text-sm font-semibold">{name}</div><StatusPill tone="neutral">Não configurado</StatusPill></div>
            <Button variant="unstyled" size="unstyled" type="button" disabled className="mt-4 rounded-lg border border-border px-3 py-2 text-xs text-muted-foreground opacity-60">Configuração indisponível</Button>
          </div>
        ))}
      </div>
    </Card>
  );
}

type SettingsProps = { settings: TenantSettings; onChange: (settings: TenantSettings) => void };

function Card({ title, description, children }: { title: string; description?: string; children: ReactNode }) {
  return <section className="mb-5 overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-card"><header className="border-b border-border px-6 py-4"><h2 className="text-base font-semibold">{title}</h2>{description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}</header><div className="space-y-4 p-6">{children}</div></section>;
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return <label className="block"><span className="text-xs font-medium text-muted-foreground">{label}</span><div className="mt-1.5">{children}</div></label>;
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (value: number) => void }) {
  return <Field label={label}><input type="number" min={1} className={inputClass} value={value} onChange={(event) => onChange(Math.max(1, Number(event.target.value) || 1))} /></Field>;
}

function Toggle({ label, description, value, onChange }: { label: string; description?: string; value: boolean; onChange: (value: boolean) => void }) {
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-1 p-3">
      <div><div className="text-sm font-medium">{label}</div>{description && <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>}</div>
      <Button variant="unstyled" size="unstyled" type="button" role="switch" aria-checked={value} aria-label={label} onClick={() => onChange(!value)} className={`relative h-6 w-11 shrink-0 rounded-full transition ${value ? "bg-primary" : "bg-surface-3"}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${value ? "left-5" : "left-0.5"}`} /></Button>
    </div>
  );
}

function RoleCard({ title, items }: { title: string; items: string[] }) {
  return <div className="rounded-xl border border-border bg-surface-1 p-4"><div className="text-sm font-semibold">{title}</div><ul className="mt-3 space-y-2 text-xs text-muted-foreground">{items.map((item) => <li key={item} className="flex items-center gap-2"><Bell className="h-3 w-3 text-primary" aria-hidden="true" />{item}</li>)}</ul></div>;
}

const inputClass = "h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20 disabled:opacity-60";
