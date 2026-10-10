import { pageHead } from "@/lib/page-head";
import { createFileRoute } from "@tanstack/react-router";
import { useContemplations } from "@/hooks/use-consortium-quotas";
import { useQuotas } from "@/hooks/use-consortium-quotas";
import { ConsultorExportBar } from "@/components/consultor-export-bar";
import { Award } from "@/components/ui/icons";

export const Route = createFileRoute("/consultor/contemplacoes")({
  head: () => pageHead("Consultor · Contemplacoes"),
  component: ContemplacoesPage,
});

const BRL = (n: number) => n.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

function ContemplacoesPage() {
  const { data: events = [] } = useContemplations();
  const { data: quotas = [] } = useQuotas();
  const qmap = Object.fromEntries(quotas.map(q => [q.id, q]));

  const grouped: Record<string, any[]> = (events as any[]).reduce((acc: Record<string, any[]>, e: any) => {
    const month = new Date(e.data).toLocaleDateString("pt-BR", { month: "long", year: "numeric" });
    (acc[month] ||= []).push(e);
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      <ConsultorExportBar
        title="Contemplações"
        rows={events as any[]}
        dateField="data"
        filenameBase="contemplacoes"
        columns={[
          { key: "data", label: "Data", format: v => new Date(v).toLocaleDateString("pt-BR") },
          { key: "tipo", label: "Tipo", format: v => String(v).replace("_", " ") },
          { key: "quota_id", label: "Cota", format: (v: string) => qmap[v]?.numero_cota ?? "—" },
          { key: "valor_lance", label: "Lance (R$)", format: v => v ? BRL(Number(v)) : "" },
          { key: "observacao", label: "Observação", format: v => v ?? "" },
        ]}
        kpisFor={rs => [
          { label: "Total contemplações", valor: String(rs.length) },
          { label: "Lances", valor: BRL(rs.reduce((s, r: any) => s + Number(r.valor_lance || 0), 0)) },
        ]}
      />

      {Object.entries(grouped).map(([month, items]) => (
        <div key={month} className="rounded-2xl border border-border bg-surface-1 p-5">
          <h3 className="mb-3 text-sm font-semibold capitalize">{month}</h3>
          <div className="space-y-2">
            {items.map((e: any) => {
              const q = qmap[e.quota_id];
              return (
                <div key={e.id} className="flex items-center justify-between rounded-xl border border-border bg-surface-2 px-4 py-3">
                  <div className="flex items-center gap-3">
                    <Award className="h-4 w-4 text-primary" />
                    <div>
                      <div className="text-sm font-medium">Cota {q?.numero_cota ?? "—"} · {e.tipo.replace("_", " ")}</div>
                      <div className="text-xs text-muted-foreground">{new Date(e.data).toLocaleDateString("pt-BR")}</div>
                    </div>
                  </div>
                  {e.valor_lance && <span className="text-sm font-semibold text-emerald-500">{BRL(e.valor_lance)}</span>}
                </div>
              );
            })}
          </div>
        </div>
      ))}
      {!events.length && (
        <div className="rounded-2xl border border-dashed border-border p-10 text-center text-sm text-muted-foreground">
          Nenhuma contemplação registrada ainda.
        </div>
      )}
    </div>
  );
}
