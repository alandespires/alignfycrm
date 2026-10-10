import { pageHead } from "@/lib/page-head";
import { Button } from "@/components/ui/button";
import { createFileRoute } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useCreditProducts, useCreateCreditSimulation, useCreditSimulations, calcularCreditoPrice, CREDIT_TYPE_LABEL } from "@/hooks/use-credit";
import { useLeads } from "@/hooks/use-leads";
import { ConsultorExportBar } from "@/components/consultor-export-bar";
import { Landmark, Send } from "@/components/ui/icons";

export const Route = createFileRoute("/consultor/credito")({
  head: () => pageHead("Consultor · Credito"),
  component: CreditoPage,
});

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function CreditoPage() {
  const { data: products = [] } = useCreditProducts();
  const { data: leads = [] } = useLeads();
  const { data: history = [] } = useCreditSimulations();
  const create = useCreateCreditSimulation();

  const [valor, setValor] = useState(20000);
  const [prazo, setPrazo] = useState(48);
  const [taxa, setTaxa] = useState(1.99);
  const [productId, setProductId] = useState("");
  const [leadId, setLeadId] = useState("");

  const calc = useMemo(() => calcularCreditoPrice({ valor, taxa_mensal_pct: taxa, prazo }), [valor, taxa, prazo]);

  function salvar() {
    create.mutate({
      lead_id: leadId || null, product_id: productId || null,
      valor_solicitado: valor, prazo_meses: prazo, taxa_mensal: taxa,
    });
  }

  return (
    <div className="space-y-5">
      <ConsultorExportBar
        title="Simulações de Crédito"
        rows={history}
        dateField="created_at"
        filenameBase="simulacoes-credito"
        columns={[
          { key: "created_at", label: "Data", format: v => new Date(v).toLocaleDateString("pt-BR") },
          { key: "valor_solicitado", label: "Valor (R$)", format: v => BRL(Number(v || 0)) },
          { key: "prazo_meses", label: "Prazo (m)" },
          { key: "taxa_mensal", label: "Taxa (%)" },
          { key: "parcela", label: "Parcela (R$)", format: v => BRL(Number(v || 0)) },
          { key: "total_pago", label: "Total (R$)", format: v => BRL(Number(v || 0)) },
          { key: "cet_anual", label: "CET a.a. (%)" },
        ]}
        kpisFor={rs => [
          { label: "Simulações", valor: String(rs.length) },
          { label: "Volume", valor: BRL(rs.reduce((s, r) => s + Number(r.valor_solicitado || 0), 0)) },
        ]}
      />
      <div className="grid gap-5 lg:grid-cols-3">
      <div className="space-y-4 lg:col-span-2 rounded-2xl border border-border bg-surface-1 p-5">
        <div className="flex items-center gap-2">
          <Landmark className="h-5 w-5 text-primary" />
          <h2 className="text-lg font-semibold">Simulador de Crédito</h2>
        </div>
        <div className="grid gap-3 md:grid-cols-2">
          <Field label="Produto"><select value={productId} onChange={e => setProductId(e.target.value)} className="i">
            <option value="">— livre —</option>
            {products.map(p => <option key={p.id} value={p.id}>{p.nome} ({CREDIT_TYPE_LABEL[p.tipo]})</option>)}
          </select></Field>
          <Field label="Lead"><select value={leadId} onChange={e => setLeadId(e.target.value)} className="i">
            <option value="">— —</option>
            {leads.map(l => <option key={l.id} value={l.id}>{l.nome}</option>)}
          </select></Field>
          <Field label="Valor solicitado (R$)"><input type="number" value={valor} onChange={e => setValor(+e.target.value)} className="i" /></Field>
          <Field label="Prazo (meses)"><input type="number" value={prazo} onChange={e => setPrazo(+e.target.value)} className="i" /></Field>
          <Field label="Taxa mensal (%)"><input type="number" step="0.01" value={taxa} onChange={e => setTaxa(+e.target.value)} className="i" /></Field>
        </div>
        <Button variant="unstyled" size="unstyled" onClick={salvar} disabled={create.isPending} className="inline-flex items-center gap-2 rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-glow disabled:opacity-60">
          <Send className="h-4 w-4" /> Salvar simulação
        </Button>
      </div>

      <div className="space-y-3">
        <div className="rounded-2xl border border-primary/40 bg-primary/10 p-5">
          <div className="text-xs uppercase tracking-wider text-primary">Parcela mensal</div>
          <div className="mt-2 text-3xl font-bold">{BRL(calc.parcela)}</div>
          <div className="mt-3 grid grid-cols-2 gap-2 text-xs text-muted-foreground">
            <div>Total a pagar<br /><span className="text-foreground font-semibold">{BRL(calc.total)}</span></div>
            <div>Juros totais<br /><span className="text-foreground font-semibold">{BRL(calc.total - valor)}</span></div>
          </div>
        </div>
        <div className="rounded-2xl border border-border bg-surface-1 p-5">
          <h3 className="mb-2 text-sm font-semibold">Últimas simulações</h3>
          <div className="space-y-1.5">
            {history.slice(0, 6).map(s => (
              <div key={s.id} className="flex items-center justify-between text-xs">
                <span>{BRL(s.valor_solicitado)} / {s.prazo_meses}m</span>
                <span className="font-semibold text-primary">{BRL(s.parcela)}</span>
              </div>
            ))}
            {!history.length && <p className="text-xs text-muted-foreground">Nenhuma simulação.</p>}
          </div>
        </div>
      </div>

      <style>{`.i{width:100%;border-radius:10px;border:1px solid hsl(var(--border));background:hsl(var(--background));padding:8px 12px;font-size:14px}`}</style>
      </div>
    </div>
  );
}

function Field({ label, children }: any) {
  return <label className="block"><span className="mb-1 block text-xs text-muted-foreground">{label}</span>{children}</label>;
}
