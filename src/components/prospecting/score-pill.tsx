import type { Tier } from "@/lib/prospecting/types";

const STYLE: Record<Tier, string> = {
  excelente: "bg-success/15 text-success",
  bom: "bg-primary/15 text-primary",
  medio: "bg-warning/15 text-warning",
  baixo: "bg-muted text-muted-foreground",
};

const LABEL: Record<Tier, string> = {
  excelente: "Excelente",
  bom: "Bom",
  medio: "Médio",
  baixo: "Baixo",
};

export function ScorePill({ score, tier }: { score: number; tier: Tier }) {
  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[11px] font-bold tabular-nums ${STYLE[tier]}`}>
      {score}
      <span className="font-medium opacity-70">· {LABEL[tier]}</span>
    </span>
  );
}
