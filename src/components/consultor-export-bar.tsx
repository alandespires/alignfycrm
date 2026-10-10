import { Button } from "@/components/ui/button";
import { useState } from "react";
import { Download, FileText, FileSpreadsheet } from "@/components/ui/icons";
import { exportCSV, exportPDF, filterByPeriod, type Column } from "@/lib/consultor-exports";

type Props<T> = {
  title: string;
  rows: T[];
  columns: Column<T>[];
  dateField: keyof T;
  filenameBase: string;
  kpisFor?: (filtered: T[]) => { label: string; valor: string }[];
  onFilteredChange?: (rows: T[]) => void;
};

export function ConsultorExportBar<T extends Record<string, any>>({
  title, rows, columns, dateField, filenameBase, kpisFor, onFilteredChange,
}: Props<T>) {
  const [since, setSince] = useState<string>("");
  const [until, setUntil] = useState<string>("");

  const filtered = filterByPeriod(rows, dateField, since || undefined, until || undefined);
  // notify parent on demand (kept simple — render-time)
  if (onFilteredChange) {
    // microtask to avoid setState during render warnings in parent
    queueMicrotask(() => onFilteredChange(filtered));
  }

  const periodoLabel = since || until ? `${since || "—"} → ${until || "—"}` : "Todo o período";
  const fileSuffix = since || until ? `-${(since || "ini")}_${(until || "fim")}` : "";

  return (
    <div className="flex flex-wrap items-end gap-2 rounded-2xl border border-border bg-surface-1 p-3">
      <div className="flex items-end gap-2">
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">De</span>
          <input type="date" value={since} onChange={e => setSince(e.target.value)}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs" />
        </label>
        <label className="block">
          <span className="mb-1 block text-[10px] uppercase tracking-wider text-muted-foreground">Até</span>
          <input type="date" value={until} onChange={e => setUntil(e.target.value)}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs" />
        </label>
        {(since || until) && (
          <Button variant="unstyled" size="unstyled" onClick={() => { setSince(""); setUntil(""); }}
            className="rounded-lg border border-border bg-background px-2.5 py-1.5 text-[11px] text-muted-foreground hover:text-foreground">
            limpar
          </Button>
        )}
      </div>
      <div className="ml-auto flex items-center gap-2">
        <span className="text-xs text-muted-foreground">{filtered.length} registro(s)</span>
        <Button variant="unstyled" size="unstyled"
          onClick={() => exportCSV(filtered, columns, `${filenameBase}${fileSuffix}`)}
          className="inline-flex items-center gap-1.5 rounded-lg border border-border bg-background px-2.5 py-1.5 text-xs font-semibold hover:bg-surface-2">
          <FileSpreadsheet className="h-3.5 w-3.5" /> CSV
        </Button>
        <Button variant="unstyled" size="unstyled"
          onClick={() => exportPDF(title, filtered, columns, {
            periodo: periodoLabel,
            resumo: `${filtered.length} registro(s) no período ${periodoLabel}.`,
            kpis: kpisFor?.(filtered),
          })}
          className="inline-flex items-center gap-1.5 rounded-lg border border-primary/30 bg-primary/10 px-2.5 py-1.5 text-xs font-semibold text-primary hover:bg-primary/20">
          <FileText className="h-3.5 w-3.5" /> PDF
        </Button>
      </div>
      <Download className="hidden" />
    </div>
  );
}
