import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { Cog, Save, RotateCcw, Bell, Wand2 } from "@/components/ui/icons";
import { useSchoolSettings } from "@/hooks/use-school-settings";
import { useTeacherAlerts } from "@/hooks/use-school";
import { useCreateTask } from "@/hooks/use-tasks";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export const Route = createFileRoute("/escolar/configuracoes")({
  head: () => pageHead("Escolar · Configuracoes"), component: Page });

function Page() {
  const { settings, update, reset } = useSchoolSettings();
  const { data: alerts } = useTeacherAlerts();
  const createTask = useCreateTask();

  async function gerarTarefas() {
    const risco = alerts?.alunosRisco ?? [];
    const pendentes = alerts?.avaliacoesPendentes ?? [];
    if (!risco.length && !pendentes.length) return toast.info("Nenhum alerta no momento.");
    let n = 0;
    for (const a of risco) {
      await createTask.mutateAsync({
        titulo: `Atenção: ${a.nome} com baixa frequência`,
        descricao: `Aluno com ${a.faltas}/${a.total} faltas (${Math.round((a.faltas/a.total)*100)}%). Limite atual: ${settings.faltaPctLimite}%.`,
        prioridade: "alta",
      });
      n++;
    }
    for (const p of pendentes) {
      await createTask.mutateAsync({
        titulo: `Lançar notas: ${p.titulo}`,
        descricao: `Faltam ${p.faltam} notas para esta avaliação.`,
        prioridade: "media",
      });
      n++;
    }
    toast.success(`${n} ${n === 1 ? "tarefa criada" : "tarefas criadas"}.`);
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="ks-card p-6">
        <header className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-primary/15 text-primary"><Bell className="h-5 w-5" /></div>
          <div>
            <h2 className="text-lg font-semibold">Regras de alertas</h2>
            <p className="text-xs text-muted-foreground">Ajuste os limiares que disparam avisos no painel.</p>
          </div>
        </header>

        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="% máximo de faltas" hint="Acima disto, o aluno entra em risco.">
            <div className="flex items-center gap-2">
              <Input type="number" min={5} max={100} value={settings.faltaPctLimite} onChange={(e) => update({ faltaPctLimite: Math.max(5, Math.min(100, Number(e.target.value) || 0)) })} />
              <span className="text-sm text-muted-foreground">%</span>
            </div>
          </Field>
          <Field label="Mínimo de aulas" hint="Quantas aulas registradas para começar a avaliar.">
            <Input type="number" min={1} max={50} value={settings.minAulasParaRisco} onChange={(e) => update({ minAulasParaRisco: Math.max(1, Number(e.target.value) || 1) })} />
          </Field>
          <Field label="Tolerância p/ nota pendente" hint="Dias após a data da avaliação para virar alerta.">
            <div className="flex items-center gap-2">
              <Input type="number" min={0} max={60} value={settings.diasParaNotaPendente} onChange={(e) => update({ diasParaNotaPendente: Math.max(0, Number(e.target.value) || 0) })} />
              <span className="text-sm text-muted-foreground">dias</span>
            </div>
          </Field>
          <Field label="Média mínima esperada" hint="Abaixo desta média a turma vira alerta.">
            <Input type="number" step="0.1" min={0} max={10} value={settings.mediaMinima} onChange={(e) => update({ mediaMinima: Math.max(0, Math.min(10, Number(e.target.value) || 0)) })} />
          </Field>
        </div>

        <div className="mt-5 flex items-center justify-between rounded-xl border border-border bg-surface-1 p-3">
          <div>
            <div className="text-sm font-semibold">Gerar tarefas automaticamente</div>
            <div className="text-xs text-muted-foreground">Cria tarefas no CRM ao detectar alertas.</div>
          </div>
          <Switch checked={settings.gerarTarefasAuto} onCheckedChange={(v) => update({ gerarTarefasAuto: !!v })} />
        </div>

        <div className="mt-5 flex items-center justify-between gap-2">
          <Button variant="ghost" onClick={() => { reset(); toast.success("Limiares restaurados"); }}>
            <RotateCcw className="h-4 w-4" /> Restaurar padrões
          </Button>
          <Button onClick={() => toast.success("Configurações salvas")}>
            <Save className="h-4 w-4" /> Salvar
          </Button>
        </div>
      </section>

      <section className="ks-card p-6">
        <header className="mb-4 flex items-center gap-3">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-accent/20 text-accent"><Wand2 className="h-5 w-5" /></div>
          <div>
            <h2 className="text-lg font-semibold">Automações</h2>
            <p className="text-xs text-muted-foreground">Transforme alertas em tarefas no CRM.</p>
          </div>
        </header>

        <div className="space-y-3">
          <SummaryRow label="Alunos em risco" value={alerts?.alunosRisco?.length ?? 0} tone="warning" />
          <SummaryRow label="Avaliações pendentes" value={alerts?.avaliacoesPendentes?.length ?? 0} tone="muted" />
        </div>

        <Button className="mt-5 w-full" onClick={gerarTarefas} disabled={createTask.isPending}>
          <Wand2 className="h-4 w-4" /> Gerar tarefas a partir dos alertas
        </Button>

        <p className="mt-3 text-[11px] text-muted-foreground">
          As tarefas geradas aparecerão em <strong>Gestão · Tarefas</strong> e poderão ser distribuídas à equipe pedagógica.
        </p>
      </section>

      <section className="ks-card col-span-full flex items-center gap-3 p-5">
        <Cog className="h-5 w-5 text-muted-foreground" />
        <p className="text-xs text-muted-foreground">
          Dica: as regras valem para todo o módulo Align Escolar deste tenant. Mudanças refletem imediatamente no painel e na console da turma.
        </p>
      </section>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</Label>
      <div className="mt-1.5">{children}</div>
      {hint && <p className="mt-1 text-[11px] text-muted-foreground">{hint}</p>}
    </div>
  );
}

function SummaryRow({ label, value, tone }: { label: string; value: number; tone: "warning" | "muted" }) {
  const cls = tone === "warning" ? "text-warning" : "text-muted-foreground";
  return (
    <div className="flex items-center justify-between rounded-lg border border-border bg-surface-1 px-3 py-2.5">
      <span className="text-sm">{label}</span>
      <span className={`text-2xl font-bold ${cls}`}>{value}</span>
    </div>
  );
}
