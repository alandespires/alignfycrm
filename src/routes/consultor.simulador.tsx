import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useAdministrators, calcularParcela, SEGMENT_LABEL, type ConsortiumSegment } from "@/hooks/use-consortium";
import { useCreateSimulation, useSimulations } from "@/hooks/use-consortium-simulations";
import { useLeads } from "@/hooks/use-leads";
import { Calculator, Send } from "lucide-react";

export const Route = createFileRoute("/consultor/simulador")({
  component: SimuladorPage,
});

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function SimuladorPage() {
  const { data: admins = [] } = useAdministrators();
  const { data: leads = [] } = useLeads();
  const { data: history = [] } = useSimulations();
  const createSim = useCreateSimulation();

  const [segmento, setSegmento] = useState<ConsortiumSegment>("imovel");
  const [credito, setCredito] = useState(200000);
  const [prazo, setPrazo] = useState(180);
  const [taxaAdm, setTaxaAdm] = useState(18);
  const [fr, setFr] = useState(2);
  const [seguro, setSeguro] = useState(35);
  const [lance, setLance] = useState(0);
  const [adminId, setAdminId] = useState<string>("");
  const [leadId, setLeadId] = useState<string>("");

  const calc = useMemo(() => calcularParcela({
    credito, prazo, taxa_adm: taxaAdm, fundo_reserva: fr, seguro_mensal: seguro, lance_embutido_pct: lance,
  }), [credito, prazo, taxaAdm, fr, seguro, lance]);

  function salvar() {
    createSim.mutate({
      lead_id: leadId || null, administrator_id: adminId || null,
      segmento, credito, prazo_meses: prazo, taxa_adm: taxaAdm,
      fundo_reserva: fr, seguro_mensal: seguro, lance_embutido_pct: lance,
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      <div className="lg:col-span-2 space-y-4 rounded-2xl border border-border bg-surface-1 p-5">
        <div className="flex items-center gap-2">
          <Calculator className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Simulador de Consórcio</h2>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Segmento">
            <select value={segmento} onChange={e => setSegmento(e.target.value as ConsortiumSegment)} className="input">
              {(Object.keys(SEGMENT_LABEL) as ConsortiumSegment[]).map(s => (
                <option key={s} value={s}>{SEGMENT_LABEL[s]}</option>
              ))}
            </select>
          </Field>
          <Field label="Administradora">
            <select value={adminId} onChange={e => setAdminId(e.target.value)} className="input">
              <option value="">— selecione —</option>
              {admins.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
          </Field>
          <Field label="Crédito (R$)">
            <input type="number" value={credito} onChange={e => setCredito(+e.target.value)} className="input" />
          </Field>
          <Field label="Prazo (meses)">
            <input type="number" value={prazo} onChange={e => setPrazo(+e.target.value)} className="input" />
          </Field>
          <Field label="Taxa adm. (%)">
            <input type="number" step="0.1" value={taxaAdm} onChange={e => setTaxaAdm(+e.target.value)} className="input" />
          </Field>
          <Field label="Fundo de reserva (%)">
            <input type="number" step="0.1" value={fr} onChange={e => setFr(+e.target.value)} className="input" />
          </Field>
          <Field label="Seguro mensal (R$)">
            <input type="number" value={seguro} onChange={e => setSeguro(+e.target.value)} className="input" />
          </Field>
          <Field label="Lance embutido (%)">
            <input type="number" step="1" value={lance} onChange={e => setLance(+e.target.value)} className="input" />
          </Field>
          <Field label="Vincular ao lead">
            <select value={leadId} onChange={e => setLeadId(e.target.value)} className="input">
              <option value="">— nenhum —</option>
              {leads.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
            </select>
          </Field>
        </div>

        <button onClick={salvar} disabled={createSim.isPending}
          className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
          <Send className="h-4 w-4" /> {createSim.isPending ? "Gerando..." : "Salvar simulação"}
        </button>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-primary/40 bg-primary/10 p-5">
          <div className="text-xs uppercase tracking-wider text-primary">Parcela estimada</div>
          <div className="mt-2 text-3xl font-bold tracking-tight">{BRL(calc.parcela)}</div>
          {lance > 0 && (
            <div className="mt-1 text-xs text-muted-foreground">
              Com lance embutido ({lance}%): <span className="font-semibold text-foreground">{BRL(calc.parcelaComLance)}</span>
            </div>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>Total pago<br /><span className="text-foreground font-semibold">{BRL(calc.total)}</span></div>
            <div>Em {prazo} meses<br /><span className="text-foreground font-semibold">{Math.floor(prazo/12)} anos</span></div>
          </div>
        </div>

        <div className="rounded-2xl border border-border bg-surface-1 p-5">
          <h3 className="mb-2 text-sm font-semibold">Últimas simulações</h3>
          <div className="space-y-1.5">
            {history.slice(0, 6).map(s => (
              <div key={s.id} className="flex items-center justify-between text-xs">
                <span className="truncate">{SEGMENT_LABEL[s.segmento]} · {BRL(s.credito)}</span>
                <span className="font-semibold text-primary">{BRL(s.parcela_estimada)}</span>
              </div>
            ))}
            {!history.length && <p className="text-xs text-muted-foreground">Nenhuma simulação ainda.</p>}
          </div>
        </div>
      </div>

      <style>{`.input{width:100%;border-radius:10px;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:8px 12px;font-size:14px}`}</style>
    </div>
  );
}

function Field({ label, children }: { label: string; children: any }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}
