import { createFileRoute } from "@tanstack/react-router";
import { useState } from "react";
import { AppShell, StatusPill, PrimaryButton } from "@/components/app-shell";
import { useAuth } from "@/contexts/auth-context";
import { useTenant } from "@/contexts/tenant-context";
import { useTeam, useSetCommercialRole, useMyCommercialRole, type CommercialRole } from "@/hooks/use-commercial-role";
import {
  UserCircle, Users, Shield, Plug, Palette, ShoppingBag, Megaphone, Save,
  Mail, MessageSquare, Calendar, Webhook, Globe, Bell, Languages, Loader2,
} from "lucide-react";

export const Route = createFileRoute("/configuracoes")({
  head: () => ({ meta: [{ title: "Configurações — Align CRM" }] }),
  component: ConfigPage,
});

type TabId = "perfil" | "equipe" | "permissoes" | "integracoes" | "personalizacao" | "vendas" | "marketing";

const TABS: { id: TabId; label: string; icon: any }[] = [
  { id: "perfil", label: "Perfil", icon: UserCircle },
  { id: "equipe", label: "Usuários e Equipe", icon: Users },
  { id: "permissoes", label: "Permissões", icon: Shield },
  { id: "integracoes", label: "Integrações", icon: Plug },
  { id: "personalizacao", label: "Personalização", icon: Palette },
  { id: "vendas", label: "Vendas", icon: ShoppingBag },
  { id: "marketing", label: "Marketing", icon: Megaphone },
];

function ConfigPage() {
  const [tab, setTab] = useState<TabId>("perfil");

  return (
    <AppShell title="Configurações" subtitle="Personalize o Align CRM para o seu time">
      <div className="grid gap-6 lg:grid-cols-[240px_1fr]">
        <aside className="rounded-2xl border border-border bg-surface-2 p-2 shadow-card lg:sticky lg:top-24 lg:self-start">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={[
                "flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition",
                tab === t.id ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-surface-3 hover:text-foreground",
              ].join(" ")}
            >
              <t.icon className="h-4 w-4" />
              <span className="font-medium">{t.label}</span>
            </button>
          ))}
        </aside>

        <div>
          {tab === "perfil" && <PerfilTab />}
          {tab === "equipe" && <EquipeTab />}
          {tab === "permissoes" && <PermissoesTab />}
          {tab === "integracoes" && <IntegracoesTab />}
          {tab === "personalizacao" && <PersonalizacaoTab />}
          {tab === "vendas" && <VendasTab />}
          {tab === "marketing" && <MarketingTab />}
        </div>
      </div>
    </AppShell>
  );
}

function Card({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-card">
      <div className="border-b border-border px-6 py-4">
        <h3 className="text-base font-semibold">{title}</h3>
        {description && <p className="mt-1 text-xs text-muted-foreground">{description}</p>}
      </div>
      <div className="space-y-4 p-6">{children}</div>
    </div>
  );
}

function Field({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) {
  return (
    <label className="block">
      <span className="text-xs font-medium text-muted-foreground">{label}</span>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </label>
  );
}

const inputClass = "h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm focus:border-primary/60 focus:outline-none focus:ring-2 focus:ring-primary/20";

function Toggle({ label, description, defaultChecked }: { label: string; description?: string; defaultChecked?: boolean }) {
  const [on, setOn] = useState(defaultChecked ?? false);
  return (
    <div className="flex items-center justify-between gap-4 rounded-lg border border-border bg-surface-1 p-3">
      <div className="min-w-0">
        <div className="text-sm font-medium">{label}</div>
        {description && <div className="mt-0.5 text-xs text-muted-foreground">{description}</div>}
      </div>
      <button
        onClick={() => setOn((v) => !v)}
        className={`relative h-6 w-11 shrink-0 rounded-full transition ${on ? "bg-primary" : "bg-surface-3"}`}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${on ? "left-5" : "left-0.5"}`} />
      </button>
    </div>
  );
}

function PerfilTab() {
  const { user } = useAuth();
  return (
    <>
      <Card title="Informações pessoais" description="Suas informações de perfil são visíveis para o seu time">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Nome completo">
            <input className={inputClass} defaultValue={user?.user_metadata?.full_name || ""} />
          </Field>
          <Field label="E-mail">
            <input className={inputClass} defaultValue={user?.email || ""} disabled />
          </Field>
          <Field label="Cargo">
            <input className={inputClass} placeholder="Ex.: Diretor Comercial" />
          </Field>
          <Field label="Telefone">
            <input className={inputClass} placeholder="(11) 99999-9999" />
          </Field>
        </div>
        <div className="flex justify-end">
          <PrimaryButton icon={Save}>Salvar alterações</PrimaryButton>
        </div>
      </Card>
      <Card title="Preferências">
        <Toggle label="Notificações por e-mail" description="Receber resumo diário de leads e tarefas" defaultChecked />
        <Toggle label="Notificações push do navegador" description="Alertas em tempo real" defaultChecked />
        <Toggle label="Modo compacto na lista de leads" />
      </Card>
    </>
  );
}

function EquipeTab() {
  const { current } = useTenant();
  const { canEdit } = useMyCommercialRole();
  const isAdmin = current?.role === "tenant_admin";
  const { data: team = [], isLoading } = useTeam();
  const setRole = useSetCommercialRole();

  const ROLE_LABEL: Record<CommercialRole, string> = {
    admin: "Admin Comercial",
    comercial: "Comercial",
    visualizador: "Visualizador",
  };

  return (
    <Card title="Membros do time" description={`Workspace: ${current?.tenant?.nome ?? "—"}`}>
      {isLoading ? (
        <div className="flex items-center justify-center py-10 text-muted-foreground">
          <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Carregando equipe…
        </div>
      ) : team.length === 0 ? (
        <div className="rounded-lg border border-dashed border-border p-8 text-center text-sm text-muted-foreground">
          Nenhum membro encontrado.
        </div>
      ) : (
        <ul className="divide-y divide-border rounded-lg border border-border bg-surface-1">
          {team.map((m) => {
            const name = m.profile?.full_name || m.profile?.email || m.user_id.slice(0, 8);
            const email = m.profile?.email || "—";
            const initials = name.split(" ").map((s) => s[0]).join("").slice(0, 2).toUpperCase();
            const currentRole: CommercialRole = m.commercial_role ?? (m.role === "tenant_admin" ? "admin" : "visualizador");
            return (
              <li key={m.user_id} className="flex flex-wrap items-center gap-4 p-4">
                <div className="grid h-9 w-9 place-items-center rounded-full bg-primary/15 text-xs font-bold text-primary">
                  {initials}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-semibold">{name}</div>
                  <div className="text-xs text-muted-foreground">{email}</div>
                </div>
                {m.role === "tenant_admin" && (
                  <StatusPill tone="info">Workspace Admin</StatusPill>
                )}
                {isAdmin && canEdit ? (
                  <select
                    value={currentRole}
                    onChange={(e) => setRole.mutate({ userId: m.user_id, role: e.target.value as CommercialRole })}
                    disabled={setRole.isPending}
                    className="h-9 rounded-md border border-border bg-surface-2 px-2 text-xs font-medium"
                  >
                    <option value="admin">Admin Comercial</option>
                    <option value="comercial">Comercial</option>
                    <option value="visualizador">Visualizador</option>
                  </select>
                ) : (
                  <span className="rounded-md bg-surface-3 px-2 py-1 text-[11px] font-medium">
                    {ROLE_LABEL[currentRole]}
                  </span>
                )}
              </li>
            );
          })}
        </ul>
      )}
      <p className="text-[11px] text-muted-foreground">
        Apenas o admin do workspace pode alterar permissões comerciais. <strong>Admin</strong> edita e exclui · <strong>Comercial</strong> cria e edita · <strong>Visualizador</strong> apenas lê.
      </p>
    </Card>
  );
}

function PermissoesTab() {
  return (
    <Card title="Papéis e permissões" description="Defina o que cada papel pode ver e fazer">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border text-left text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-3">Recurso</th>
              <th className="py-3 text-center">Admin</th>
              <th className="py-3 text-center">Vendedor</th>
              <th className="py-3 text-center">Pré-vendas</th>
              <th className="py-3 text-center">Suporte</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {[
              ["Ver todos os leads", true, false, true, false],
              ["Editar pipeline", true, true, false, false],
              ["Acessar financeiro", true, false, false, false],
              ["Ver relatórios", true, true, false, true],
              ["Gerenciar automações", true, false, false, false],
              ["Atender tickets", true, false, false, true],
            ].map(([resource, ...perms], i) => (
              <tr key={i}>
                <td className="py-3 font-medium">{resource as string}</td>
                {(perms as boolean[]).map((p, j) => (
                  <td key={j} className="py-3 text-center">
                    <input type="checkbox" defaultChecked={p} className="h-4 w-4 accent-primary" />
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-end">
        <PrimaryButton icon={Save}>Salvar permissões</PrimaryButton>
      </div>
    </Card>
  );
}

function IntegracoesTab() {
  const integrations = [
    { name: "WhatsApp Business", icon: MessageSquare, status: "Conectado", desc: "Receba e envie mensagens diretamente do CRM", connected: true },
    { name: "Google Calendar", icon: Calendar, status: "Conectado", desc: "Sincronize reuniões e tarefas", connected: true },
    { name: "Gmail / Outlook", icon: Mail, status: "Disponível", desc: "Sincronização de e-mail bidirecional", connected: false },
    { name: "Webhooks", icon: Webhook, status: "Disponível", desc: "Envie eventos para qualquer sistema externo", connected: false },
    { name: "Zapier / Make", icon: Plug, status: "Disponível", desc: "Conecte com 5.000+ apps", connected: false },
    { name: "Site / Landing pages", icon: Globe, status: "Disponível", desc: "Capture leads de qualquer formulário", connected: false },
  ];
  return (
    <Card title="Integrações" description="Conecte ferramentas externas ao Align CRM">
      <div className="grid gap-3 md:grid-cols-2">
        {integrations.map((i) => (
          <div key={i.name} className="rounded-xl border border-border bg-surface-1 p-4">
            <div className="flex items-start gap-3">
              <div className={`grid h-10 w-10 place-items-center rounded-lg ${i.connected ? "bg-success/15 text-success" : "bg-surface-3 text-muted-foreground"}`}>
                <i.icon className="h-5 w-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h4 className="text-sm font-semibold">{i.name}</h4>
                  <StatusPill tone={i.connected ? "success" : "neutral"}>{i.status}</StatusPill>
                </div>
                <p className="mt-1 text-xs text-muted-foreground">{i.desc}</p>
                <button className="mt-3 text-xs font-semibold text-primary hover:underline">
                  {i.connected ? "Configurar" : "Conectar"}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </Card>
  );
}

function PersonalizacaoTab() {
  return (
    <>
      <Card title="Estágios do Pipeline" description="Adicione, renomeie ou reordene as etapas do seu funil">
        <div className="space-y-2">
          {["Novo", "Contato Inicial", "Qualificação", "Proposta", "Negociação", "Fechado", "Perdido"].map((s, i) => (
            <div key={s} className="flex items-center gap-3 rounded-lg border border-border bg-surface-1 p-3">
              <span className="text-[10px] font-mono text-muted-foreground">{i + 1}</span>
              <input defaultValue={s} className={`${inputClass} flex-1`} />
              <button className="text-xs text-muted-foreground hover:text-destructive">Remover</button>
            </div>
          ))}
        </div>
        <button className="text-xs font-semibold text-primary hover:underline">+ Adicionar estágio</button>
      </Card>
      <Card title="Tags e categorias">
        <Field label="Tags disponíveis (separadas por vírgula)">
          <input className={inputClass} defaultValue="VIP, Decisor, Hot, Renovação, Champion, Detractor" />
        </Field>
      </Card>
      <Card title="Preferências regionais">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Idioma"><select className={inputClass}><option>Português (BR)</option><option>English (US)</option><option>Español</option></select></Field>
          <Field label="Moeda"><select className={inputClass}><option>BRL — Real</option><option>USD — Dólar</option><option>EUR — Euro</option></select></Field>
          <Field label="Fuso horário"><select className={inputClass}><option>America/Sao_Paulo (UTC-3)</option><option>America/New_York</option><option>Europe/Lisbon</option></select></Field>
          <Field label="Formato de data"><select className={inputClass}><option>DD/MM/AAAA</option><option>MM/DD/AAAA</option><option>AAAA-MM-DD</option></select></Field>
        </div>
      </Card>
    </>
  );
}

function VendasTab() {
  return (
    <>
      <Card title="Configurações de vendas" description="Comportamento padrão do funil e propostas">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Probabilidade padrão por estágio (%)" hint="Usado para previsão de receita">
            <input className={inputClass} defaultValue="10, 25, 40, 60, 80" />
          </Field>
          <Field label="Tempo máximo em estágio (dias)" hint="Alerta quando lead estagna">
            <input className={inputClass} type="number" defaultValue="14" />
          </Field>
          <Field label="Validade padrão de propostas (dias)">
            <input className={inputClass} type="number" defaultValue="15" />
          </Field>
          <Field label="Numeração de propostas">
            <input className={inputClass} defaultValue="2026-{####}" />
          </Field>
        </div>
        <Toggle label="Atribuir leads automaticamente (round-robin)" defaultChecked />
        <Toggle label="Notificar em todo lead novo de alta prioridade" defaultChecked />
        <Toggle label="Exigir motivo ao marcar lead como Perdido" />
      </Card>
    </>
  );
}

function MarketingTab() {
  return (
    <>
      <Card title="Configurações de marketing" description="Disparos, domínios e identidade visual">
        <div className="grid gap-4 md:grid-cols-2">
          <Field label="Remetente padrão (e-mail marketing)"><input className={inputClass} placeholder="contato@suaempresa.com" /></Field>
          <Field label="Nome do remetente"><input className={inputClass} placeholder="Sua Empresa" /></Field>
          <Field label="Domínio de envio (DKIM)" hint="Configure SPF/DKIM no seu DNS">
            <input className={inputClass} placeholder="mail.suaempresa.com" />
          </Field>
          <Field label="UTM padrão para campanhas"><input className={inputClass} defaultValue="utm_source=kscrm&utm_medium=email" /></Field>
        </div>
        <Toggle label="Adicionar link de descadastro automaticamente" defaultChecked />
        <Toggle label="Usar IA para sugerir assuntos de e-mail" defaultChecked />
        <Toggle label="Enviar relatório semanal de campanhas" defaultChecked />
      </Card>
      <Card title="Preferências de comunicação">
        <div className="grid gap-3 md:grid-cols-3">
          <div className="rounded-lg border border-border bg-surface-1 p-4 text-center">
            <Bell className="mx-auto h-5 w-5 text-primary" />
            <div className="mt-2 text-sm font-semibold">Push</div>
            <div className="text-xs text-muted-foreground">Em tempo real</div>
          </div>
          <div className="rounded-lg border border-border bg-surface-1 p-4 text-center">
            <Mail className="mx-auto h-5 w-5 text-primary" />
            <div className="mt-2 text-sm font-semibold">E-mail</div>
            <div className="text-xs text-muted-foreground">Resumo diário</div>
          </div>
          <div className="rounded-lg border border-border bg-surface-1 p-4 text-center">
            <Languages className="mx-auto h-5 w-5 text-primary" />
            <div className="mt-2 text-sm font-semibold">Idioma</div>
            <div className="text-xs text-muted-foreground">Português</div>
          </div>
        </div>
      </Card>
    </>
  );
}
