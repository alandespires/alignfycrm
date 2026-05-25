import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { AppShell, PrimaryButton, StatusPill } from "@/components/app-shell";
import {
  useEntries, useCreateEntry, useUpdateEntry, useDeleteEntry,
  useExpenses, useCreateExpense, useUpdateExpense, useDeleteExpense,
  useFinSubscriptions, useCreateFinSub, useUpdateFinSub, useDeleteFinSub,
  useCommissions, useCreateCommission, useUpdateCommission, useDeleteCommission,
  brl, startOfMonth, endOfMonth,
  computeEntryReceived, computeEntryBalance, effectiveEntryStatus,
  type EntryRow, type ExpenseRow, type SubRow, type CommissionRow,
  type FinStatus, type EntryCategory, type ExpenseCategory, type PaymentMethod,
  type SubStatus, type CommissionStatus,
} from "@/hooks/use-finance";
import { useAllPayments } from "@/hooks/use-payments";
import { useRealtimeSync } from "@/hooks/use-realtime";
import { useClients } from "@/hooks/use-clients";
import { ReconciliationModal } from "@/components/reconciliation-modal";
import {
  Wallet, TrendingUp, TrendingDown, Repeat, AlertTriangle, Award, FileBarChart,
  Plus, Trash2, X, Loader2, Sparkles, ArrowUpRight, ArrowDownRight, Clock,
  CheckCircle2, XCircle, CalendarClock, DollarSign, Activity, Receipt, Layers,
} from "lucide-react";

export const Route = createFileRoute("/financeiro")({
  head: () => ({ meta: [{ title: "Financeiro — Align CRM" }] }),
  validateSearch: (search: Record<string, unknown>) => ({
    tab: (search.tab as Tab | undefined) ?? undefined,
  }),
  component: FinanceiroPage,
});

type Tab = "dashboard" | "receber" | "pagar" | "fluxo" | "parcelas" | "assinaturas" | "inadimplencia" | "comissoes" | "relatorios";

const TABS: { id: Tab; label: string; icon: any }[] = [
  { id: "dashboard", label: "Dashboard", icon: Wallet },
  { id: "receber", label: "Contas a Receber", icon: TrendingUp },
  { id: "pagar", label: "Contas a Pagar", icon: TrendingDown },
  { id: "fluxo", label: "Fluxo de Caixa", icon: Activity },
  { id: "parcelas", label: "Parcelas", icon: Layers },
  { id: "assinaturas", label: "Assinaturas", icon: Repeat },
  { id: "inadimplencia", label: "Inadimplência", icon: AlertTriangle },
  { id: "comissoes", label: "Comissões", icon: Award },
  { id: "relatorios", label: "Relatórios", icon: FileBarChart },
];

function FinanceiroPage() {
  const search = Route.useSearch();
  const [tab, setTab] = useState<Tab>(search.tab ?? "dashboard");
  // Sincroniza estado quando o usuário navega via sidebar
  if (search.tab && search.tab !== tab) {
    setTimeout(() => setTab(search.tab as Tab), 0);
  }

  return (
    <AppShell title="Financeiro" subtitle="Centro de controle financeiro do seu CRM">
      <div className="mb-6 flex flex-wrap gap-1.5 rounded-xl border border-border bg-surface-1 p-1.5 shadow-card">
        {TABS.map(({ id, label, icon: Icon }) => {
          const active = tab === id;
          return (
            <button
              key={id}
              onClick={() => setTab(id)}
              className={[
                "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-all",
                active ? "bg-primary text-primary-foreground shadow-glow" : "text-muted-foreground hover:bg-surface-2 hover:text-foreground",
              ].join(" ")}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          );
        })}
      </div>

      {tab === "dashboard" && <DashboardTab />}
      {tab === "receber" && <EntradasTab />}
      {tab === "pagar" && <SaidasTab />}
      {tab === "fluxo" && <FluxoTab />}
      {tab === "parcelas" && <ParcelasTab />}
      {tab === "assinaturas" && <AssinaturasTab />}
      {tab === "inadimplencia" && <InadimplenciaTab />}
      {tab === "comissoes" && <ComissoesTab />}
      {tab === "relatorios" && <RelatoriosTab />}
    </AppShell>
  );
}

// =================================================================
// DASHBOARD — métricas reais (parcelas + exclui canceladas)
// =================================================================
function DashboardTab() {
  const { data: entries = [], isLoading: l1 } = useEntries();
  const { data: expenses = [], isLoading: l2 } = useExpenses();
  const { data: subs = [], isLoading: l3 } = useFinSubscriptions();
  const { data: comms = [], isLoading: l4 } = useCommissions();
  const { data: payments = [], isLoading: l5 } = useAllPayments();
  const loading = l1 || l2 || l3 || l4 || l5;

  const ini = startOfMonth();
  const fim = endOfMonth();
  const inMonth = (d: string | null) => !!d && new Date(d) >= ini && new Date(d) <= fim;
  const inMonthOr = (primary: string | null, fallback: string | null) =>
    inMonth(primary) || (!primary && inMonth(fallback));

  const validEntries = entries.filter((e) => e.status !== "cancelado");

  const receitaPrevista = validEntries
    .filter((e) => inMonthOr(e.vencimento, e.created_at))
    .reduce((s, e) => s + Number(e.valor), 0);

  const paidIds = new Set(payments.map((p) => p.entry_id));
  const receitaRecebidaParcelas = payments
    .filter((p) => inMonth(p.pago_em + "T12:00:00"))
    .reduce((s, p) => s + Number(p.valor), 0);
  const receitaRecebidaDireta = validEntries
    .filter((e) => e.status === "pago" && !paidIds.has(e.id) && inMonthOr(e.recebido_em, e.created_at))
    .reduce((s, e) => s + computeEntryReceived(e, payments), 0);
  const receitaRecebida = receitaRecebidaParcelas + receitaRecebidaDireta;

  const receitaPendente = validEntries
    .filter((e) => e.status !== "pago" && inMonthOr(e.vencimento, e.created_at))
    .reduce((s, e) => s + computeEntryBalance(e, payments), 0);

  const totalDespesas = expenses
    .filter((e) => e.status !== "cancelado" && e.status === "pago" && inMonthOr(e.pago_em, e.created_at))
    .reduce((s, e) => s + Number(e.valor), 0);
  const lucroLiquido = receitaRecebida - totalDespesas;

  const inadimplencia = validEntries
    .filter((e) => effectiveEntryStatus(e, payments) === "atrasado")
    .reduce((s, e) => s + computeEntryBalance(e, payments), 0);

  const comissoesPendentes = comms.filter((c) => c.status === "pendente" || c.status === "aprovada").reduce((s, c) => s + Number(c.valor), 0);
  const mrr = subs.filter((s) => s.status === "ativo" || s.status === "trial").reduce((s, x) => s + Number(x.valor_mensal), 0);

  const proximosVencimentos = validEntries
    .filter((e) => {
      const st = effectiveEntryStatus(e, payments);
      return (st === "pendente" || st === "parcial") && e.vencimento;
    })
    .sort((a, b) => (a.vencimento! < b.vencimento! ? -1 : 1))
    .slice(0, 6);

  if (loading) return <div className="grid place-items-center py-20"><Loader2 className="h-6 w-6 animate-spin text-primary" /></div>;

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Kpi icon={DollarSign} label="Receita recebida" value={brl(receitaRecebida)} sub="No mês (inclui parcelas)" tone="success" />
        <Kpi icon={Activity} label="MRR (Recorrente)" value={brl(mrr)} sub={`${subs.filter((s) => s.status === "ativo").length} ativas`} tone="info" />
        <Kpi icon={Clock} label="Receita pendente" value={brl(receitaPendente)} sub={`${validEntries.filter((e) => effectiveEntryStatus(e, payments) !== "pago" && inMonthOr(e.vencimento, e.created_at)).length} cobranças`} tone="warn" />
        <Kpi icon={TrendingDown} label="Despesas do mês" value={brl(totalDespesas)} sub={`${expenses.filter((e) => inMonth(e.pago_em)).length} pagamentos`} tone="danger" />
        <Kpi icon={TrendingUp} label="Lucro líquido" value={brl(lucroLiquido)} sub="Receita − despesas" tone={lucroLiquido >= 0 ? "success" : "danger"} />
        <Kpi icon={AlertTriangle} label="Inadimplência" value={brl(inadimplencia)} sub={`${validEntries.filter((e) => effectiveEntryStatus(e, payments) === "atrasado").length} em atraso`} tone="danger" />
        <Kpi icon={Award} label="Comissões a pagar" value={brl(comissoesPendentes)} sub={`${comms.filter((c) => c.status !== "paga" && c.status !== "cancelada").length} pendentes`} tone="warn" />
        <Kpi icon={Repeat} label="Receita prevista" value={brl(receitaPrevista)} sub="Total previsto no mês" tone="info" />
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        <div className="lg:col-span-2 rounded-2xl border border-border bg-surface-2 p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <Activity className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Fluxo de caixa (30 dias)</h3>
          </div>
          <FluxoCaixa entries={entries} expenses={expenses} />
        </div>
        <div className="rounded-2xl border border-border bg-surface-2 p-6 shadow-card">
          <div className="mb-4 flex items-center gap-2">
            <CalendarClock className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold">Próximos vencimentos</h3>
          </div>
          <ul className="space-y-2.5">
            {proximosVencimentos.length === 0 && <li className="py-6 text-center text-xs text-muted-foreground">Nenhuma cobrança pendente</li>}
            {proximosVencimentos.map((e) => (
              <li key={e.id} className="flex items-center justify-between rounded-lg border border-border bg-surface-1 px-3 py-2.5">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{e.descricao}</div>
                  <div className="text-[11px] text-muted-foreground">Vence em {new Date(e.vencimento!).toLocaleDateString("pt-BR")}</div>
                </div>
                <span className="ml-2 text-sm font-semibold tabular-nums text-primary">{brl(computeEntryBalance(e, payments))}</span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <FinanceAI entries={entries} expenses={expenses} subs={subs} comms={comms} />
    </div>
  );
}

function Kpi({ icon: Icon, label, value, sub, tone }: { icon: any; label: string; value: string; sub: string; tone: "success" | "warn" | "info" | "danger" }) {
  const colors: Record<string, string> = {
    success: "text-success bg-success/15",
    warn: "text-warning bg-warning/15",
    info: "text-primary bg-primary/15",
    danger: "text-destructive bg-destructive/15",
  };
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-5 shadow-card transition hover:shadow-elevated">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</span>
        <span className={`grid h-8 w-8 place-items-center rounded-lg ${colors[tone]}`}><Icon className="h-4 w-4" /></span>
      </div>
      <div className="text-2xl font-bold tracking-tight tabular-nums">{value}</div>
      <div className="mt-1 text-[11px] text-muted-foreground">{sub}</div>
    </div>
  );
}

function FluxoCaixa({ entries, expenses }: { entries: EntryRow[]; expenses: ExpenseRow[] }) {
  // Últimos 30 dias
  const days: { date: Date; in: number; out: number }[] = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(); d.setDate(d.getDate() - i); d.setHours(0, 0, 0, 0);
    days.push({ date: d, in: 0, out: 0 });
  }
  for (const e of entries) {
    if (e.status !== "pago" || !e.recebido_em) continue;
    const dt = new Date(e.recebido_em); dt.setHours(0, 0, 0, 0);
    const idx = days.findIndex((d) => d.date.getTime() === dt.getTime());
    if (idx >= 0) days[idx].in += Number(e.valor);
  }
  for (const x of expenses) {
    if (x.status !== "pago" || !x.pago_em) continue;
    const dt = new Date(x.pago_em); dt.setHours(0, 0, 0, 0);
    const idx = days.findIndex((d) => d.date.getTime() === dt.getTime());
    if (idx >= 0) days[idx].out += Number(x.valor);
  }
  const max = Math.max(1, ...days.map((d) => Math.max(d.in, d.out)));
  return (
    <div>
      <div className="flex h-40 items-end gap-1">
        {days.map((d, i) => (
          <div key={i} className="flex flex-1 flex-col items-center gap-0.5" title={`${d.date.toLocaleDateString("pt-BR")}\n+ ${brl(d.in)}\n− ${brl(d.out)}`}>
            <div className="flex h-full w-full flex-col-reverse gap-0.5">
              <div className="w-full rounded-t-sm bg-success/70" style={{ height: `${(d.in / max) * 100}%` }} />
              <div className="w-full rounded-t-sm bg-destructive/70" style={{ height: `${(d.out / max) * 100}%` }} />
            </div>
          </div>
        ))}
      </div>
      <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-success/70" /> Entradas</span>
        <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-destructive/70" /> Saídas</span>
        <span className="ml-auto">Últimos 30 dias</span>
      </div>
    </div>
  );
}

function FinanceAI({ entries, expenses, subs, comms }: { entries: EntryRow[]; expenses: ExpenseRow[]; subs: SubRow[]; comms: CommissionRow[] }) {
  const insights = useMemo(() => {
    const arr: { tipo: "warn" | "info" | "danger" | "success"; titulo: string; texto: string }[] = [];
    const atrasados = entries.filter((e) => e.status === "atrasado");
    if (atrasados.length > 0) {
      const total = atrasados.reduce((s, e) => s + Number(e.valor), 0);
      arr.push({ tipo: "danger", titulo: "Inadimplência detectada", texto: `${atrasados.length} cobranças em atraso totalizando ${brl(total)}. Priorize follow-up financeiro.` });
    }
    const inad = subs.filter((s) => s.status === "inadimplente");
    if (inad.length > 0) arr.push({ tipo: "warn", titulo: "Assinaturas inadimplentes", texto: `${inad.length} assinatura(s) com pagamento em aberto. Risco de churn.` });
    const mrr = subs.filter((s) => s.status === "ativo").reduce((s, x) => s + Number(x.valor_mensal), 0);
    if (mrr > 0) arr.push({ tipo: "info", titulo: "MRR atual", texto: `Sua receita recorrente mensal é ${brl(mrr)}. Foque em manter retenção alta.` });
    const ini = startOfMonth(); const fim = endOfMonth();
    const recIn = entries.filter((e) => e.status === "pago" && e.recebido_em && new Date(e.recebido_em) >= ini && new Date(e.recebido_em) <= fim).reduce((s, e) => s + Number(e.valor), 0);
    const desp = expenses.filter((e) => e.status === "pago" && e.pago_em && new Date(e.pago_em) >= ini && new Date(e.pago_em) <= fim).reduce((s, e) => s + Number(e.valor), 0);
    if (desp > recIn && recIn > 0) arr.push({ tipo: "danger", titulo: "Despesas superam receita", texto: `Custos no mês (${brl(desp)}) ultrapassaram receitas recebidas (${brl(recIn)}). Revise gastos urgentemente.` });
    else if (recIn > desp * 1.5 && recIn > 0) arr.push({ tipo: "success", titulo: "Mês saudável", texto: `Margem confortável: receita ${brl(recIn)} vs despesas ${brl(desp)}.` });
    const commPend = comms.filter((c) => c.status === "aprovada").reduce((s, c) => s + Number(c.valor), 0);
    if (commPend > 0) arr.push({ tipo: "warn", titulo: "Comissões aprovadas a pagar", texto: `${brl(commPend)} em comissões já aprovadas aguardando pagamento.` });
    if (arr.length === 0) arr.push({ tipo: "info", titulo: "Tudo em ordem", texto: "Nenhum sinal financeiro crítico no momento. Continue registrando entradas e despesas." });
    return arr;
  }, [entries, expenses, subs, comms]);

  const toneMap: Record<string, string> = {
    danger: "border-destructive/30 bg-destructive/5",
    warn: "border-warning/30 bg-warning/5",
    info: "border-primary/30 bg-primary/5",
    success: "border-success/30 bg-success/5",
  };
  const iconMap: Record<string, string> = { danger: "text-destructive", warn: "text-warning", info: "text-primary", success: "text-success" };

  return (
    <div className="rounded-2xl border border-border bg-gradient-to-br from-surface-2 to-surface-1 p-6 shadow-card">
      <div className="mb-4 flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-primary" />
        <h3 className="text-sm font-semibold">IA Financeira — análise em tempo real</h3>
      </div>
      <div className="grid gap-3 md:grid-cols-2">
        {insights.map((i, idx) => (
          <div key={idx} className={`rounded-xl border p-4 ${toneMap[i.tipo]}`}>
            <div className="mb-1 flex items-center gap-2">
              <Sparkles className={`h-3.5 w-3.5 ${iconMap[i.tipo]}`} />
              <span className="text-xs font-semibold">{i.titulo}</span>
            </div>
            <p className="text-xs leading-relaxed text-muted-foreground">{i.texto}</p>
          </div>
        ))}
      </div>
    </div>
  );
}

// =================================================================
// ENTRADAS
// =================================================================
function EntradasTab() {
  const { data: entries = [], isLoading } = useEntries();
  const { data: clients = [] } = useClients();
  const create = useCreateEntry();
  const upd = useUpdateEntry();
  const del = useDeleteEntry();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FinStatus | "todos">("todos");
  const [reconciling, setReconciling] = useState<EntryRow | null>(null);

  const validAll = entries.filter((e) => e.status !== "cancelado");
  const filtered = filter === "todos" ? validAll : validAll.filter((e) => e.status === filter);
  const totais = useMemo(() => ({
    pago: validAll.reduce((s, e) => s + Number(e.valor_pago || 0), 0),
    pendente: validAll.filter((e) => e.status === "pendente").reduce((s, e) => s + Math.max(Number(e.valor) - Number(e.valor_pago || 0), 0), 0),
    atrasado: validAll.filter((e) => e.status === "atrasado").reduce((s, e) => s + Math.max(Number(e.valor) - Number(e.valor_pago || 0), 0), 0),
  }), [validAll]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="Recebido" value={brl(totais.pago)} tone="success" />
        <MiniStat label="A receber" value={brl(totais.pendente)} tone="warn" />
        <MiniStat label="Em atraso" value={brl(totais.atrasado)} tone="danger" />
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <FilterChips value={filter} onChange={setFilter} />
        <PrimaryButton icon={Plus} onClick={() => setOpen(true)}>Nova entrada</PrimaryButton>
      </div>

      <DataTable
        loading={isLoading}
        empty="Nenhuma entrada registrada."
        cols={["Descrição", "Cliente", "Vencimento", "Valor", "Saldo", "Status", ""]}
        rows={filtered.map((e) => {
          const c = clients.find((x) => x.id === e.client_id);
          const pago = Number(e.valor_pago || 0);
          const saldo = Math.max(Number(e.valor) - pago, 0);
          const parcial = pago > 0 && saldo > 0;
          return [
            <div>
              <div className="font-medium">{e.descricao}</div>
              <div className="text-[10px] uppercase text-muted-foreground">{e.categoria}</div>
            </div>,
            c ? (c.empresa || c.nome) : "—",
            e.vencimento ? new Date(e.vencimento + "T12:00:00").toLocaleDateString("pt-BR") : "—",
            <span className="font-semibold tabular-nums text-success">{brl(Number(e.valor))}</span>,
            <span className={`tabular-nums ${saldo === 0 ? "text-muted-foreground" : parcial ? "text-warning" : "text-foreground"}`}>
              {saldo === 0 ? "Quitado" : brl(saldo)}
              {parcial && <span className="ml-1 rounded bg-warning/15 px-1 text-[9px] font-semibold uppercase text-warning">parcial</span>}
            </span>,
            <StatusSelect value={e.status} onChange={(s) => upd.mutate({ id: e.id, status: s })} />,
            <div className="flex items-center gap-1">
              <button onClick={() => setReconciling(e)} title="Reconciliar pagamentos" className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-primary/10 hover:text-primary">
                <Receipt className="h-3.5 w-3.5" />
              </button>
              <button onClick={() => { if (confirm("Remover entrada?")) del.mutate(e.id); }} className="grid h-7 w-7 place-items-center rounded-md text-muted-foreground hover:bg-destructive/10 hover:text-destructive">
                <Trash2 className="h-3.5 w-3.5" />
              </button>
            </div>,
          ];
        })}
      />

      {open && <EntryFormModal clients={clients} onClose={() => setOpen(false)} onSubmit={async (v: any) => { await create.mutateAsync(v); setOpen(false); }} loading={create.isPending} />}
      <ReconciliationModal entry={reconciling} onClose={() => setReconciling(null)} />
    </div>
  );
}

function EntryFormModal({ clients, onClose, onSubmit, loading }: any) {
  const [f, setF] = useState({
    descricao: "", valor: 0, categoria: "venda" as EntryCategory, client_id: "", origem: "",
    forma_pagamento: "" as PaymentMethod | "", status: "pendente" as FinStatus, vencimento: "", observacoes: "",
  });
  return (
    <Modal title="Nova entrada" onClose={onClose} onSubmit={(e) => { e.preventDefault(); onSubmit({
      ...f, client_id: f.client_id || null, forma_pagamento: f.forma_pagamento || null,
      vencimento: f.vencimento || null, valor: Number(f.valor),
    }); }} loading={loading}>
      <Field label="Descrição *"><input required value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} className={inputCls} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor *"><input required type="number" step="0.01" value={f.valor} onChange={(e) => setF({ ...f, valor: Number(e.target.value) })} className={inputCls} /></Field>
        <Field label="Categoria"><select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value as EntryCategory })} className={inputCls}>
          {(["venda", "assinatura", "servico", "consultoria", "outros"] as EntryCategory[]).map((c) => <option key={c} value={c}>{c}</option>)}
        </select></Field>
      </div>
      <Field label="Cliente"><select value={f.client_id} onChange={(e) => setF({ ...f, client_id: e.target.value })} className={inputCls}>
        <option value="">— Sem vínculo —</option>
        {clients.map((c: any) => <option key={c.id} value={c.id}>{c.empresa || c.nome}</option>)}
      </select></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Forma de pagamento"><select value={f.forma_pagamento} onChange={(e) => setF({ ...f, forma_pagamento: e.target.value as any })} className={inputCls}>
          <option value="">—</option>
          {(["pix", "boleto", "cartao_credito", "cartao_debito", "transferencia", "dinheiro", "outros"] as PaymentMethod[]).map((p) => <option key={p} value={p}>{p}</option>)}
        </select></Field>
        <Field label="Vencimento"><input type="date" value={f.vencimento} onChange={(e) => setF({ ...f, vencimento: e.target.value })} className={inputCls} /></Field>
      </div>
      <Field label="Status"><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as FinStatus })} className={inputCls}>
        {(["pendente", "pago", "atrasado", "cancelado"] as FinStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
      </select></Field>
    </Modal>
  );
}

// =================================================================
// SAÍDAS
// =================================================================
function SaidasTab() {
  const { data: expenses = [], isLoading } = useExpenses();
  const create = useCreateExpense();
  const upd = useUpdateExpense();
  const del = useDeleteExpense();
  const [open, setOpen] = useState(false);
  const [filter, setFilter] = useState<FinStatus | "todos">("todos");
  const validAll = expenses.filter((e) => e.status !== "cancelado");
  const filtered = filter === "todos" ? validAll : validAll.filter((e) => e.status === filter);

  const totais = useMemo(() => ({
    pago: validAll.filter((e) => e.status === "pago").reduce((s, e) => s + Number(e.valor), 0),
    pendente: validAll.filter((e) => e.status === "pendente").reduce((s, e) => s + Number(e.valor), 0),
    atrasado: validAll.filter((e) => e.status === "atrasado").reduce((s, e) => s + Number(e.valor), 0),
  }), [validAll]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="Pago" value={brl(totais.pago)} tone="info" />
        <MiniStat label="A pagar" value={brl(totais.pendente)} tone="warn" />
        <MiniStat label="Vencido" value={brl(totais.atrasado)} tone="danger" />
      </div>
      <div className="flex flex-wrap items-center gap-2">
        <FilterChips value={filter} onChange={setFilter} />
        <PrimaryButton icon={Plus} onClick={() => setOpen(true)}>Nova despesa</PrimaryButton>
      </div>

      <DataTable
        loading={isLoading}
        empty="Nenhuma despesa registrada."
        cols={["Descrição", "Categoria", "Fornecedor", "Vencimento", "Valor", "Status", ""]}
        rows={filtered.map((e) => [
          e.descricao,
          e.categoria,
          e.fornecedor || "—",
          e.vencimento ? new Date(e.vencimento).toLocaleDateString("pt-BR") : "—",
          <span className="font-semibold tabular-nums text-destructive">{brl(Number(e.valor))}</span>,
          <StatusSelect value={e.status} onChange={(s) => upd.mutate({ id: e.id, status: s, pago_em: s === "pago" ? new Date().toISOString().slice(0, 10) : null })} />,
          <button onClick={() => del.mutate(e.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>,
        ])}
      />

      {open && <ExpenseFormModal onClose={() => setOpen(false)} onSubmit={async (v: any) => { await create.mutateAsync(v); setOpen(false); }} loading={create.isPending} />}
    </div>
  );
}

function ExpenseFormModal({ onClose, onSubmit, loading }: any) {
  const [f, setF] = useState({
    descricao: "", valor: 0, categoria: "outros" as ExpenseCategory, fornecedor: "",
    forma_pagamento: "" as PaymentMethod | "", status: "pendente" as FinStatus,
    vencimento: "", recorrente: false, observacoes: "",
  });
  return (
    <Modal title="Nova despesa" onClose={onClose} onSubmit={(e) => { e.preventDefault(); onSubmit({
      ...f, forma_pagamento: f.forma_pagamento || null, vencimento: f.vencimento || null, valor: Number(f.valor),
    }); }} loading={loading}>
      <Field label="Descrição *"><input required value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} className={inputCls} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Valor *"><input required type="number" step="0.01" value={f.valor} onChange={(e) => setF({ ...f, valor: Number(e.target.value) })} className={inputCls} /></Field>
        <Field label="Categoria"><select value={f.categoria} onChange={(e) => setF({ ...f, categoria: e.target.value as ExpenseCategory })} className={inputCls}>
          {(["salario", "ferramenta", "marketing", "operacao", "imposto", "fornecedor", "comissao", "outros"] as ExpenseCategory[]).map((c) => <option key={c} value={c}>{c}</option>)}
        </select></Field>
      </div>
      <Field label="Fornecedor"><input value={f.fornecedor} onChange={(e) => setF({ ...f, fornecedor: e.target.value })} className={inputCls} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Vencimento"><input type="date" value={f.vencimento} onChange={(e) => setF({ ...f, vencimento: e.target.value })} className={inputCls} /></Field>
        <Field label="Status"><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as FinStatus })} className={inputCls}>
          {(["pendente", "pago", "atrasado", "cancelado"] as FinStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
        </select></Field>
      </div>
      <label className="flex items-center gap-2 text-xs text-muted-foreground">
        <input type="checkbox" checked={f.recorrente} onChange={(e) => setF({ ...f, recorrente: e.target.checked })} />
        Despesa recorrente (mensal)
      </label>
    </Modal>
  );
}

// =================================================================
// ASSINATURAS
// =================================================================
function AssinaturasTab() {
  const { data: subs = [], isLoading } = useFinSubscriptions();
  const { data: clients = [] } = useClients();
  const create = useCreateFinSub();
  const upd = useUpdateFinSub();
  const del = useDeleteFinSub();
  const [open, setOpen] = useState(false);

  const mrr = subs.filter((s) => s.status === "ativo" || s.status === "trial").reduce((s, x) => s + Number(x.valor_mensal), 0);
  const ativas = subs.filter((s) => s.status === "ativo").length;
  const inad = subs.filter((s) => s.status === "inadimplente").length;
  const cancel = subs.filter((s) => s.status === "cancelado").length;
  const churn = subs.length > 0 ? Math.round((cancel / subs.length) * 100) : 0;

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-4">
        <MiniStat label="MRR" value={brl(mrr)} tone="success" />
        <MiniStat label="Ativas" value={String(ativas)} tone="info" />
        <MiniStat label="Inadimplentes" value={String(inad)} tone="warn" />
        <MiniStat label="Churn" value={`${churn}%`} tone="danger" />
      </div>
      <div className="flex justify-end"><PrimaryButton icon={Plus} onClick={() => setOpen(true)}>Nova assinatura</PrimaryButton></div>

      <DataTable
        loading={isLoading}
        empty="Nenhuma assinatura cadastrada."
        cols={["Plano", "Cliente", "Mensalidade", "Início", "Próx. vencimento", "Status", ""]}
        rows={subs.map((s) => {
          const c = clients.find((x) => x.id === s.client_id);
          return [
            s.plano,
            c ? (c.empresa || c.nome) : "—",
            <span className="font-semibold tabular-nums">{brl(Number(s.valor_mensal))}/mês</span>,
            new Date(s.inicio).toLocaleDateString("pt-BR"),
            s.proximo_vencimento ? new Date(s.proximo_vencimento).toLocaleDateString("pt-BR") : "—",
            <SubStatusSelect value={s.status} onChange={(v) => upd.mutate({ id: s.id, status: v })} />,
            <button onClick={() => del.mutate(s.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>,
          ];
        })}
      />

      {open && <SubFormModal clients={clients} onClose={() => setOpen(false)} onSubmit={async (v: any) => { await create.mutateAsync(v); setOpen(false); }} loading={create.isPending} />}
    </div>
  );
}

function SubFormModal({ clients, onClose, onSubmit, loading }: any) {
  const [f, setF] = useState({
    plano: "", valor_mensal: 0, client_id: "", status: "ativo" as SubStatus,
    inicio: new Date().toISOString().slice(0, 10), proximo_vencimento: "",
  });
  return (
    <Modal title="Nova assinatura" onClose={onClose} onSubmit={(e) => { e.preventDefault(); onSubmit({
      ...f, client_id: f.client_id || null, proximo_vencimento: f.proximo_vencimento || null, valor_mensal: Number(f.valor_mensal),
    }); }} loading={loading}>
      <Field label="Plano *"><input required value={f.plano} onChange={(e) => setF({ ...f, plano: e.target.value })} className={inputCls} /></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Mensalidade *"><input required type="number" step="0.01" value={f.valor_mensal} onChange={(e) => setF({ ...f, valor_mensal: Number(e.target.value) })} className={inputCls} /></Field>
        <Field label="Status"><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as SubStatus })} className={inputCls}>
          {(["trial", "ativo", "suspenso", "cancelado", "inadimplente"] as SubStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
        </select></Field>
      </div>
      <Field label="Cliente"><select value={f.client_id} onChange={(e) => setF({ ...f, client_id: e.target.value })} className={inputCls}>
        <option value="">— Sem vínculo —</option>
        {clients.map((c: any) => <option key={c.id} value={c.id}>{c.empresa || c.nome}</option>)}
      </select></Field>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Início"><input type="date" value={f.inicio} onChange={(e) => setF({ ...f, inicio: e.target.value })} className={inputCls} /></Field>
        <Field label="Próximo vencimento"><input type="date" value={f.proximo_vencimento} onChange={(e) => setF({ ...f, proximo_vencimento: e.target.value })} className={inputCls} /></Field>
      </div>
    </Modal>
  );
}

// =================================================================
// INADIMPLÊNCIA
// =================================================================
function InadimplenciaTab() {
  const { data: entries = [], isLoading } = useEntries();
  const { data: clients = [] } = useClients();
  const upd = useUpdateEntry();

  const atrasados = entries.filter((e) => e.status === "atrasado" || (e.status === "pendente" && e.vencimento && new Date(e.vencimento) < new Date()));
  const total = atrasados.reduce((s, e) => s + Number(e.valor), 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="Total em atraso" value={brl(total)} tone="danger" />
        <MiniStat label="Cobranças vencidas" value={String(atrasados.length)} tone="warn" />
        <MiniStat label="Clientes afetados" value={String(new Set(atrasados.map((a) => a.client_id).filter(Boolean)).size)} tone="info" />
      </div>

      {isLoading ? <Loading /> : atrasados.length === 0 ? (
        <EmptyState icon={CheckCircle2} title="Nenhuma inadimplência" text="Todas as cobranças estão em dia. Excelente trabalho!" />
      ) : (
        <div className="overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-card">
          <ul className="divide-y divide-border">
            {atrasados.map((e) => {
              const c = clients.find((x) => x.id === e.client_id);
              const diasAtraso = e.vencimento ? Math.floor((Date.now() - new Date(e.vencimento).getTime()) / 86400000) : 0;
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-3 px-5 py-4">
                  <div className="grid h-10 w-10 place-items-center rounded-lg bg-destructive/15 text-destructive">
                    <AlertTriangle className="h-4 w-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-semibold">{e.descricao}</div>
                    <div className="text-[11px] text-muted-foreground">
                      {c ? (c.empresa || c.nome) : "Sem cliente"} · Venceu em {e.vencimento ? new Date(e.vencimento).toLocaleDateString("pt-BR") : "—"} · <span className="text-destructive">{diasAtraso} dias de atraso</span>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold tabular-nums text-destructive">{brl(Number(e.valor))}</div>
                  </div>
                  <button onClick={() => upd.mutate({ id: e.id, status: "pago", recebido_em: new Date().toISOString().slice(0, 10) })}
                    className="inline-flex h-8 items-center gap-1.5 rounded-md bg-success/15 px-3 text-xs font-semibold text-success hover:bg-success/25">
                    <CheckCircle2 className="h-3.5 w-3.5" /> Marcar como pago
                  </button>
                </li>
              );
            })}
          </ul>
        </div>
      )}
    </div>
  );
}

// =================================================================
// COMISSÕES
// =================================================================
function ComissoesTab() {
  const { data: comms = [], isLoading } = useCommissions();
  const create = useCreateCommission();
  const upd = useUpdateCommission();
  const del = useDeleteCommission();
  const [open, setOpen] = useState(false);

  const totais = useMemo(() => ({
    pendente: comms.filter((c) => c.status === "pendente").reduce((s, c) => s + Number(c.valor), 0),
    aprovada: comms.filter((c) => c.status === "aprovada").reduce((s, c) => s + Number(c.valor), 0),
    paga: comms.filter((c) => c.status === "paga").reduce((s, c) => s + Number(c.valor), 0),
  }), [comms]);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="Pendentes" value={brl(totais.pendente)} tone="warn" />
        <MiniStat label="Aprovadas" value={brl(totais.aprovada)} tone="info" />
        <MiniStat label="Pagas" value={brl(totais.paga)} tone="success" />
      </div>
      <div className="flex justify-end"><PrimaryButton icon={Plus} onClick={() => setOpen(true)}>Nova comissão</PrimaryButton></div>

      <DataTable
        loading={isLoading}
        empty="Nenhuma comissão registrada."
        cols={["Descrição", "Base", "%", "Valor", "Competência", "Status", ""]}
        rows={comms.map((c) => [
          c.descricao,
          brl(Number(c.base_valor)),
          c.percentual ? `${c.percentual}%` : "—",
          <span className="font-semibold tabular-nums">{brl(Number(c.valor))}</span>,
          c.competencia ? new Date(c.competencia).toLocaleDateString("pt-BR") : "—",
          <CommStatusSelect value={c.status} onChange={(v) => upd.mutate({ id: c.id, status: v, paga_em: v === "paga" ? new Date().toISOString().slice(0, 10) : null })} />,
          <button onClick={() => del.mutate(c.id)} className="text-muted-foreground hover:text-destructive"><Trash2 className="h-3.5 w-3.5" /></button>,
        ])}
      />

      {open && <CommFormModal onClose={() => setOpen(false)} onSubmit={async (v: any) => { await create.mutateAsync(v); setOpen(false); }} loading={create.isPending} />}
    </div>
  );
}

function CommFormModal({ onClose, onSubmit, loading }: any) {
  const [f, setF] = useState({
    descricao: "", base_valor: 0, percentual: 10, valor: 0, status: "pendente" as CommissionStatus,
    competencia: new Date().toISOString().slice(0, 10), user_id: "",
  });
  // auto-cálculo
  function recalc(base: number, pct: number) { return Math.round(base * (pct / 100) * 100) / 100; }
  return (
    <Modal title="Nova comissão" onClose={onClose} onSubmit={async (e) => {
      e.preventDefault();
      const { supabase } = await import("@/integrations/supabase/client");
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return;
      onSubmit({ ...f, user_id: f.user_id || u.user.id, competencia: f.competencia || null, valor: Number(f.valor) });
    }} loading={loading}>
      <Field label="Descrição *"><input required value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} className={inputCls} placeholder="Ex: Comissão venda Cliente X" /></Field>
      <div className="grid grid-cols-3 gap-3">
        <Field label="Base (R$)"><input type="number" step="0.01" value={f.base_valor} onChange={(e) => { const b = Number(e.target.value); setF({ ...f, base_valor: b, valor: recalc(b, f.percentual) }); }} className={inputCls} /></Field>
        <Field label="%"><input type="number" step="0.1" value={f.percentual} onChange={(e) => { const p = Number(e.target.value); setF({ ...f, percentual: p, valor: recalc(f.base_valor, p) }); }} className={inputCls} /></Field>
        <Field label="Valor *"><input required type="number" step="0.01" value={f.valor} onChange={(e) => setF({ ...f, valor: Number(e.target.value) })} className={inputCls} /></Field>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Field label="Competência"><input type="date" value={f.competencia} onChange={(e) => setF({ ...f, competencia: e.target.value })} className={inputCls} /></Field>
        <Field label="Status"><select value={f.status} onChange={(e) => setF({ ...f, status: e.target.value as CommissionStatus })} className={inputCls}>
          {(["pendente", "aprovada", "paga", "cancelada"] as CommissionStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
        </select></Field>
      </div>
    </Modal>
  );
}

// =================================================================
// RELATÓRIOS
// =================================================================
function RelatoriosTab() {
  const { data: entries = [] } = useEntries();
  const { data: expenses = [] } = useExpenses();
  const { data: comms = [] } = useCommissions();

  // Faturamento últimos 6 meses
  const months: { label: string; receita: number; despesa: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1);
    const ini = startOfMonth(d); const fim = endOfMonth(d);
    const receita = entries.filter((e) => e.status === "pago" && e.recebido_em && new Date(e.recebido_em) >= ini && new Date(e.recebido_em) <= fim).reduce((s, e) => s + Number(e.valor), 0);
    const despesa = expenses.filter((e) => e.status === "pago" && e.pago_em && new Date(e.pago_em) >= ini && new Date(e.pago_em) <= fim).reduce((s, e) => s + Number(e.valor), 0);
    months.push({ label: d.toLocaleDateString("pt-BR", { month: "short" }), receita, despesa });
  }
  const max = Math.max(1, ...months.flatMap((m) => [m.receita, m.despesa]));

  // Despesas por categoria
  const expCat = expenses.reduce<Record<string, number>>((acc, e) => { acc[e.categoria] = (acc[e.categoria] || 0) + Number(e.valor); return acc; }, {});
  const expCatArr = Object.entries(expCat).sort((a, b) => b[1] - a[1]);
  const expMax = Math.max(1, ...expCatArr.map(([, v]) => v));

  // Receita por origem
  const recOrig = entries.filter((e) => e.status === "pago").reduce<Record<string, number>>((acc, e) => { const k = e.origem || "Sem origem"; acc[k] = (acc[k] || 0) + Number(e.valor); return acc; }, {});
  const recOrigArr = Object.entries(recOrig).sort((a, b) => b[1] - a[1]).slice(0, 6);
  const recMax = Math.max(1, ...recOrigArr.map(([, v]) => v));

  // Comissões por colaborador
  const commByUser = comms.reduce<Record<string, number>>((acc, c) => { acc[c.user_id] = (acc[c.user_id] || 0) + Number(c.valor); return acc; }, {});
  const commByUserArr = Object.entries(commByUser).slice(0, 6);

  return (
    <div className="space-y-5">
      <Card title="Faturamento — últimos 6 meses" icon={TrendingUp}>
        <div className="flex h-48 items-end gap-3">
          {months.map((m, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-full w-full items-end justify-center gap-1">
                <div className="w-1/2 rounded-t-md bg-success/70" style={{ height: `${(m.receita / max) * 100}%` }} title={`Receita: ${brl(m.receita)}`} />
                <div className="w-1/2 rounded-t-md bg-destructive/70" style={{ height: `${(m.despesa / max) * 100}%` }} title={`Despesa: ${brl(m.despesa)}`} />
              </div>
              <span className="text-[10px] font-medium uppercase text-muted-foreground">{m.label}</span>
            </div>
          ))}
        </div>
        <div className="mt-3 flex items-center gap-4 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-success/70" /> Receita</span>
          <span className="flex items-center gap-1.5"><span className="h-2 w-2 rounded-sm bg-destructive/70" /> Despesa</span>
        </div>
      </Card>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card title="Despesas por categoria" icon={TrendingDown}>
          {expCatArr.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">Sem dados</p> :
            <ul className="space-y-2.5">
              {expCatArr.map(([cat, val]) => (
                <li key={cat}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span className="capitalize">{cat}</span>
                    <span className="font-semibold tabular-nums">{brl(val)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full bg-gradient-to-r from-primary to-[oklch(0.55_0.16_35)]" style={{ width: `${(val / expMax) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>}
        </Card>

        <Card title="Receita por origem" icon={ArrowUpRight}>
          {recOrigArr.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">Sem dados</p> :
            <ul className="space-y-2.5">
              {recOrigArr.map(([orig, val]) => (
                <li key={orig}>
                  <div className="mb-1 flex items-center justify-between text-xs">
                    <span>{orig}</span>
                    <span className="font-semibold tabular-nums">{brl(val)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                    <div className="h-full rounded-full bg-success" style={{ width: `${(val / recMax) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>}
        </Card>

        <Card title="Comissões por colaborador" icon={Award}>
          {commByUserArr.length === 0 ? <p className="py-6 text-center text-xs text-muted-foreground">Sem dados</p> :
            <ul className="space-y-2">
              {commByUserArr.map(([uid, val]) => (
                <li key={uid} className="flex items-center justify-between rounded-lg bg-surface-1 px-3 py-2 text-xs">
                  <span className="truncate text-muted-foreground">{uid.slice(0, 8)}…</span>
                  <span className="font-semibold tabular-nums">{brl(val)}</span>
                </li>
              ))}
            </ul>}
        </Card>

        <Card title="Resumo do período" icon={FileBarChart}>
          <ul className="space-y-2 text-sm">
            <li className="flex justify-between"><span className="text-muted-foreground">Total de entradas pagas</span><span className="font-semibold tabular-nums text-success">{brl(entries.filter((e) => e.status === "pago").reduce((s, e) => s + Number(e.valor), 0))}</span></li>
            <li className="flex justify-between"><span className="text-muted-foreground">Total de despesas pagas</span><span className="font-semibold tabular-nums text-destructive">{brl(expenses.filter((e) => e.status === "pago").reduce((s, e) => s + Number(e.valor), 0))}</span></li>
            <li className="flex justify-between border-t border-border pt-2"><span className="font-medium">Lucro líquido total</span><span className="font-bold tabular-nums">{brl(entries.filter((e) => e.status === "pago").reduce((s, e) => s + Number(e.valor), 0) - expenses.filter((e) => e.status === "pago").reduce((s, e) => s + Number(e.valor), 0))}</span></li>
          </ul>
        </Card>
      </div>
    </div>
  );
}

// =================================================================
// FLUXO DE CAIXA — visão expandida
// =================================================================
function FluxoTab() {
  const { data: entries = [] } = useEntries();
  const { data: expenses = [] } = useExpenses();
  const { data: payments = [] } = useAllPayments();

  const validEntries = entries.filter((e) => e.status !== "cancelado");
  const validExpenses = expenses.filter((e) => e.status !== "cancelado");

  // 6 meses
  const months: { label: string; receita: number; despesa: number; saldo: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(); d.setMonth(d.getMonth() - i); d.setDate(1);
    const ini = startOfMonth(d); const fim = endOfMonth(d);
    const recPay = payments.filter((p) => { const dt = new Date(p.pago_em + "T12:00:00"); return dt >= ini && dt <= fim; }).reduce((s, p) => s + Number(p.valor), 0);
    const paidIds = new Set(payments.map((p) => p.entry_id));
    const recDirect = validEntries.filter((e) => e.status === "pago" && !paidIds.has(e.id) && e.recebido_em && new Date(e.recebido_em) >= ini && new Date(e.recebido_em) <= fim).reduce((s, e) => s + Number(e.valor), 0);
    const receita = recPay + recDirect;
    const despesa = validExpenses.filter((e) => e.status === "pago" && e.pago_em && new Date(e.pago_em) >= ini && new Date(e.pago_em) <= fim).reduce((s, e) => s + Number(e.valor), 0);
    months.push({ label: d.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" }), receita, despesa, saldo: receita - despesa });
  }
  const max = Math.max(1, ...months.flatMap((m) => [m.receita, m.despesa]));
  const totalRec = months.reduce((s, m) => s + m.receita, 0);
  const totalDesp = months.reduce((s, m) => s + m.despesa, 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="Receita 6 meses" value={brl(totalRec)} tone="success" />
        <MiniStat label="Despesa 6 meses" value={brl(totalDesp)} tone="danger" />
        <MiniStat label="Saldo acumulado" value={brl(totalRec - totalDesp)} tone={totalRec - totalDesp >= 0 ? "success" : "danger"} />
      </div>

      <Card title="Fluxo mensal — 6 meses" icon={Activity}>
        <div className="flex h-56 items-end gap-3">
          {months.map((m, i) => (
            <div key={i} className="flex flex-1 flex-col items-center gap-1.5">
              <div className="flex h-full w-full items-end justify-center gap-1">
                <div className="w-1/2 rounded-t-md bg-success/70" style={{ height: `${(m.receita / max) * 100}%` }} title={`Receita: ${brl(m.receita)}`} />
                <div className="w-1/2 rounded-t-md bg-destructive/70" style={{ height: `${(m.despesa / max) * 100}%` }} title={`Despesa: ${brl(m.despesa)}`} />
              </div>
              <span className="text-[10px] font-medium uppercase text-muted-foreground">{m.label}</span>
            </div>
          ))}
        </div>
      </Card>

      <Card title="Detalhamento mensal" icon={FileBarChart}>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="border-b border-border">
              <tr className="text-left text-[11px] uppercase tracking-wider text-muted-foreground">
                <th className="py-2">Mês</th><th>Receita</th><th>Despesa</th><th>Saldo</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {months.map((m, i) => (
                <tr key={i}>
                  <td className="py-2 font-medium capitalize">{m.label}</td>
                  <td className="tabular-nums text-success">{brl(m.receita)}</td>
                  <td className="tabular-nums text-destructive">{brl(m.despesa)}</td>
                  <td className={`tabular-nums font-semibold ${m.saldo >= 0 ? "text-success" : "text-destructive"}`}>{brl(m.saldo)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}

// =================================================================
// PARCELAS — histórico de pagamentos
// =================================================================
function ParcelasTab() {
  const { data: payments = [], isLoading } = useAllPayments();
  const { data: entries = [] } = useEntries();
  const { data: clients = [] } = useClients();

  const enriched = useMemo(() => payments.map((p) => {
    const entry = entries.find((e) => e.id === p.entry_id);
    const client = entry ? clients.find((c) => c.id === entry.client_id) : null;
    return { p, entry, client };
  }), [payments, entries, clients]);

  const total = payments.reduce((s, p) => s + Number(p.valor), 0);
  const noMes = payments.filter((p) => { const d = new Date(p.pago_em + "T12:00:00"); return d >= startOfMonth() && d <= endOfMonth(); }).reduce((s, p) => s + Number(p.valor), 0);

  return (
    <div className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <MiniStat label="Total recebido" value={brl(total)} tone="success" />
        <MiniStat label="Recebido no mês" value={brl(noMes)} tone="info" />
        <MiniStat label="Nº de parcelas" value={String(payments.length)} tone="info" />
      </div>

      <DataTable
        loading={isLoading}
        empty="Nenhuma parcela registrada. Use o botão de reconciliação em Contas a Receber para registrar pagamentos parciais."
        cols={["Data", "Entrada", "Cliente", "Valor", "Forma"]}
        rows={enriched.map(({ p, entry, client }) => [
          new Date(p.pago_em + "T12:00:00").toLocaleDateString("pt-BR"),
          entry ? <div><div className="font-medium">{entry.descricao}</div><div className="text-[10px] uppercase text-muted-foreground">{entry.categoria}</div></div> : "—",
          client ? (client.empresa || client.nome) : "—",
          <span className="font-semibold tabular-nums text-success">{brl(Number(p.valor))}</span>,
          <span className="text-xs capitalize">{p.forma_pagamento || "—"}</span>,
        ])}
      />
    </div>
  );
}


function Card({ title, icon: Icon, children }: { title: string; icon: any; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-surface-2 p-6 shadow-card">
      <div className="mb-4 flex items-center gap-2"><Icon className="h-4 w-4 text-primary" /><h3 className="text-sm font-semibold">{title}</h3></div>
      {children}
    </div>
  );
}
function MiniStat({ label, value, tone }: { label: string; value: string; tone: "success" | "warn" | "info" | "danger" }) {
  const colors: Record<string, string> = { success: "text-success", warn: "text-warning", info: "text-primary", danger: "text-destructive" };
  return (
    <div className="rounded-xl border border-border bg-surface-2 px-4 py-3 shadow-card">
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`mt-1 text-xl font-bold tabular-nums ${colors[tone]}`}>{value}</div>
    </div>
  );
}
function FilterChips({ value, onChange }: { value: FinStatus | "todos"; onChange: (v: FinStatus | "todos") => void }) {
  const opts: { v: FinStatus | "todos"; l: string }[] = [
    { v: "todos", l: "Todos" }, { v: "pendente", l: "Pendente" },
    { v: "pago", l: "Pago" }, { v: "atrasado", l: "Atrasado" }, { v: "cancelado", l: "Cancelado" },
  ];
  return (
    <div className="flex flex-wrap gap-1.5">
      {opts.map((o) => (
        <button key={o.v} onClick={() => onChange(o.v)} className={[
          "h-9 rounded-lg border px-3 text-xs font-medium transition",
          value === o.v ? "border-primary bg-primary/10 text-primary" : "border-border bg-surface-1 text-muted-foreground hover:text-foreground",
        ].join(" ")}>{o.l}</button>
      ))}
    </div>
  );
}
function DataTable({ cols, rows, loading, empty }: { cols: string[]; rows: React.ReactNode[][]; loading: boolean; empty: string }) {
  if (loading) return <Loading />;
  if (rows.length === 0) return <EmptyState icon={Wallet} title="Sem registros" text={empty} />;
  return (
    <div className="overflow-hidden rounded-2xl border border-border bg-surface-2 shadow-card">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="border-b border-border bg-surface-1/40">
            <tr>{cols.map((c, i) => <th key={i} className="px-4 py-3 text-left text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{c}</th>)}</tr>
          </thead>
          <tbody className="divide-y divide-border">
            {rows.map((r, i) => (
              <tr key={i} className="hover:bg-surface-1/40">
                {r.map((cell, j) => <td key={j} className="px-4 py-3">{cell}</td>)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
function StatusSelect({ value, onChange }: { value: FinStatus; onChange: (v: FinStatus) => void }) {
  const tones: Record<FinStatus, string> = {
    pago: "bg-success/15 text-success border-success/30",
    pendente: "bg-warning/15 text-warning border-warning/30",
    atrasado: "bg-destructive/15 text-destructive border-destructive/30",
    cancelado: "bg-surface-3 text-muted-foreground border-border",
  };
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as FinStatus)}
      className={`h-7 rounded-md border px-2 text-[11px] font-semibold ${tones[value]}`}>
      {(["pendente", "pago", "atrasado", "cancelado"] as FinStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}
function SubStatusSelect({ value, onChange }: { value: SubStatus; onChange: (v: SubStatus) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as SubStatus)}
      className="h-7 rounded-md border border-border bg-surface-1 px-2 text-[11px] font-semibold">
      {(["trial", "ativo", "suspenso", "cancelado", "inadimplente"] as SubStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}
function CommStatusSelect({ value, onChange }: { value: CommissionStatus; onChange: (v: CommissionStatus) => void }) {
  return (
    <select value={value} onChange={(e) => onChange(e.target.value as CommissionStatus)}
      className="h-7 rounded-md border border-border bg-surface-1 px-2 text-[11px] font-semibold">
      {(["pendente", "aprovada", "paga", "cancelada"] as CommissionStatus[]).map((s) => <option key={s} value={s}>{s}</option>)}
    </select>
  );
}
function Loading() {
  return <div className="grid place-items-center rounded-2xl border border-border bg-surface-2 py-16"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>;
}
function EmptyState({ icon: Icon, title, text }: { icon: any; title: string; text: string }) {
  return (
    <div className="grid place-items-center rounded-2xl border border-dashed border-border bg-surface-1/40 py-16 text-center">
      <Icon className="mb-3 h-10 w-10 text-muted-foreground" />
      <h3 className="text-base font-semibold">{title}</h3>
      <p className="mt-1 max-w-sm px-4 text-sm text-muted-foreground">{text}</p>
    </div>
  );
}
function Modal({ title, onClose, onSubmit, loading, children }: { title: string; onClose: () => void; onSubmit: (e: FormEvent) => void; loading?: boolean; children: React.ReactNode }) {
  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-black/60 p-4 backdrop-blur-sm" onClick={onClose}>
      <form onClick={(e) => e.stopPropagation()} onSubmit={onSubmit} className="w-full max-w-lg rounded-2xl border border-border bg-surface-2 shadow-elevated">
        <div className="flex items-center justify-between border-b border-border p-5">
          <h3 className="text-lg font-semibold">{title}</h3>
          <button type="button" onClick={onClose} className="grid h-8 w-8 place-items-center rounded-md text-muted-foreground hover:bg-surface-3"><X className="h-4 w-4" /></button>
        </div>
        <div className="space-y-3 p-5">{children}</div>
        <div className="flex justify-end gap-2 border-t border-border p-4">
          <button type="button" onClick={onClose} className="h-10 rounded-lg border border-border bg-surface-1 px-4 text-sm text-muted-foreground">Cancelar</button>
          <button type="submit" disabled={loading} className="inline-flex h-10 items-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
            {loading && <Loader2 className="h-4 w-4 animate-spin" />} Salvar
          </button>
        </div>
      </form>
    </div>
  );
}
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="text-xs font-medium text-muted-foreground">{label}</span><div className="mt-1.5">{children}</div></label>;
}
const inputCls = "h-10 w-full rounded-lg border border-border bg-surface-1 px-3 text-sm focus:border-primary/60 focus:outline-none";
