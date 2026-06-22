import { gerarRelatorioPDF, type RelatorioPayload } from "./kassia-pdf";

export type Column<T> = { key: keyof T | string; label: string; format?: (v: any, row: T) => string };

function csvEscape(value: any): string {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n;]/.test(s)) return `"${s.replace(/"/g, '""')}"`;
  return s;
}

export function exportCSV<T>(rows: T[], columns: Column<T>[], filename: string) {
  const header = columns.map(c => csvEscape(c.label)).join(";");
  const body = rows.map(r =>
    columns.map(c => {
      const raw = (r as any)[c.key];
      return csvEscape(c.format ? c.format(raw, r) : raw);
    }).join(";")
  ).join("\n");
  const blob = new Blob(["\uFEFF" + header + "\n" + body], { type: "text/csv;charset=utf-8" });
  triggerDownload(blob, filename.endsWith(".csv") ? filename : `${filename}.csv`);
}

export function exportPDF<T>(
  title: string,
  rows: T[],
  columns: Column<T>[],
  meta?: { tenant?: string; periodo?: string; resumo?: string; kpis?: { label: string; valor: string }[] }
) {
  const payload: RelatorioPayload = {
    tipo: "geral",
    titulo: title,
    resumo: meta?.resumo ?? `${rows.length} registro(s) exportado(s).`,
    kpis: meta?.kpis ?? [],
    tabela: {
      colunas: columns.map(c => c.label),
      linhas: rows.map(r => columns.map(c => {
        const raw = (r as any)[c.key];
        return String(c.format ? c.format(raw, r) : (raw ?? ""));
      })),
    },
    insights: [],
  };
  gerarRelatorioPDF(payload, { tenant: meta?.tenant, periodo: meta?.periodo });
}

function triggerDownload(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function filterByPeriod<T extends { created_at?: string; data?: string; pagar_em?: string | null }>(
  rows: T[],
  dateField: keyof T,
  since?: string,
  until?: string
): T[] {
  if (!since && !until) return rows;
  return rows.filter(r => {
    const d = (r as any)[dateField] as string | null | undefined;
    if (!d) return false;
    const ts = new Date(d).getTime();
    if (since && ts < new Date(since).getTime()) return false;
    if (until && ts > new Date(until + "T23:59:59").getTime()) return false;
    return true;
  });
}
