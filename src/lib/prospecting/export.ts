import type { ProspectingResultRow } from "./types";

const HEADERS = [
  "Nome",
  "Segmento",
  "Cidade",
  "UF",
  "Telefone",
  "WhatsApp",
  "E-mail",
  "Site",
  "Instagram",
  "Score",
  "Confiabilidade",
  "Oportunidade",
  "Status",
  "Data da pesquisa",
];

function safeCell(value: unknown): string | number {
  if (typeof value === "number") return value;
  const text = String(value ?? "");
  return /^[=+\-@\t\r]/.test(text) ? `'${text}` : text;
}

function rows(results: ProspectingResultRow[]) {
  return results.map((result) =>
    [
      result.nome,
      result.segmento,
      result.cidade,
      result.uf,
      result.telefone,
      result.whatsapp,
      result.email,
      result.site,
      result.instagram,
      result.score,
      result.confiabilidade,
      result.oportunidade,
      result.status,
      result.created_at,
    ].map(safeCell),
  );
}

function download(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function exportProspectingCsv(results: ProspectingResultRow[]) {
  const content = [HEADERS, ...rows(results)]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(";"))
    .join("\r\n");
  download(new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" }), "prospeccao.csv");
}

export async function exportProspectingXlsx(results: ProspectingResultRow[]) {
  const XLSX = await import("xlsx");
  const sheet = XLSX.utils.aoa_to_sheet([HEADERS, ...rows(results)]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Prospecção");
  XLSX.writeFile(workbook, "prospeccao.xlsx", { compression: true });
}
