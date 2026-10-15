import { useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Calendar } from "@/components/ui/icons";
import type { LeadRow } from "@/hooks/use-leads";

export function ForecastField({ lead }: { lead: LeadRow }) {
  const qc = useQueryClient();
  const l = lead as LeadRow & { previsao_fechamento?: string | null; motivo_perda?: string | null };
  async function save(value: string) {
    const { error } = await supabase.from("leads").update({ previsao_fechamento: value || null }).eq("id", lead.id);
    if (error) return void toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["leads"] });
    toast.success("Previsão salva");
  }
  return (
    <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border bg-surface-2 p-3 text-xs">
      <label className="flex items-center gap-2 font-semibold">
        <Calendar className="h-3.5 w-3.5 text-primary" /> Previsão de fechamento
        <input type="date" defaultValue={l.previsao_fechamento ?? ""} onChange={(e) => save(e.target.value)}
          className="h-8 rounded-md border border-border bg-surface-1 px-2 text-xs font-normal" />
      </label>
      {lead.status === "perdido" && l.motivo_perda && <span className="text-destructive">Motivo da perda: {l.motivo_perda}</span>}
    </div>
  );
}
