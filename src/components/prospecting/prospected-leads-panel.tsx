import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { getActiveTenantId } from "@/contexts/tenant-context";
import { useCampaigns } from "@/hooks/use-marketing";

type ProspectedLead = {
  id: string;
  nome: string;
  nicho: string | null;
  cidade: string | null;
  whatsapp: string | null;
  prospecting_score: number | null;
  campaign_id: string | null;
  status: string;
};

function countBy<T>(rows: T[], key: (row: T) => string) {
  const map = new Map<string, number>();
  rows.forEach((row) => map.set(key(row), (map.get(key(row)) ?? 0) + 1));
  return [...map.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8);
}

export function ProspectedLeadsPanel() {
  const tenantId = getActiveTenantId();
  const { data: campaigns = [] } = useCampaigns();
  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["prospected-leads", tenantId],
    enabled: !!tenantId,
    queryFn: async (): Promise<ProspectedLead[]> => {
      const { data, error } = await supabase
        .from("leads")
        .select("id,nome,nicho,cidade,whatsapp,prospecting_score,campaign_id,status")
        .eq("tenant_id", tenantId!)
        .not("prospecting_result_id", "is", null)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as ProspectedLead[];
    },
  });

  const stats = useMemo(() => {
    const scores = leads.map((l) => l.prospecting_score ?? 0);
    const campName = (id: string | null) => campaigns.find((c) => c.id === id)?.nome ?? "Sem campanha";
    return {
      avg: scores.length ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0,
      cities: countBy(leads, (l) => l.cidade ?? "Sem cidade"),
      niches: countBy(leads, (l) => l.nicho ?? "Sem nicho"),
      camps: countBy(leads, (l) => campName(l.campaign_id)),
      bands: [
        ["70–100", scores.filter((s) => s >= 70).length],
        ["40–69", scores.filter((s) => s >= 40 && s < 70).length],
        ["0–39", scores.filter((s) => s < 40).length],
      ] as [string, number][],
    };
  }, [leads, campaigns]);

  if (isLoading) return <div className="py-8 text-center text-sm text-muted-foreground">Carregando…</div>;
  if (!leads.length)
    return <div className="py-8 text-center text-sm text-muted-foreground">Nenhum lead importado ainda.</div>;

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <Metric label="Leads importados" value={leads.length} />
        <Metric label="Score médio" value={stats.avg} />
        <Metric label="Com telefone" value={leads.filter((l) => l.whatsapp).length} />
        <Metric label="Cidades" value={stats.cities.length} />
      </div>
      <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-4">
        <Bars title="Por cidade" rows={stats.cities} />
        <Bars title="Por score" rows={stats.bands} />
        <Bars title="Por nicho" rows={stats.niches} />
        <Bars title="Por campanha" rows={stats.camps} />
      </div>
      <div className="divide-y divide-border rounded-xl border border-border bg-surface-1 text-sm">
        {leads.slice(0, 20).map((l) => (
          <div key={l.id} className="flex items-center gap-3 p-3">
            <div className="min-w-0 flex-1">
              <div className="truncate font-medium">{l.nome}</div>
              <div className="text-xs text-muted-foreground">
                {l.cidade ?? "—"} · {l.nicho ?? "—"} · {l.whatsapp ?? "sem telefone"}
              </div>
            </div>
            <span className="rounded-md bg-primary/15 px-2 py-0.5 text-xs font-semibold text-primary">
              {l.prospecting_score ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-xl border border-border bg-surface-1 p-3">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold">{value}</div>
    </div>
  );
}

function Bars({ title, rows }: { title: string; rows: [string, number][] }) {
  const max = Math.max(1, ...rows.map((r) => r[1]));
  return (
    <div className="rounded-xl border border-border bg-surface-1 p-3">
      <div className="mb-2 text-xs font-semibold text-muted-foreground">{title}</div>
      <div className="space-y-1.5">
        {rows.map(([name, n]) => (
          <div key={name} className="text-xs">
            <div className="flex justify-between"><span className="truncate">{name}</span><span>{n}</span></div>
            <div className="h-1.5 rounded bg-surface-3"><div className="h-1.5 rounded bg-primary" style={{ width: `${(n / max) * 100}%` }} /></div>
          </div>
        ))}
      </div>
    </div>
  );
}
