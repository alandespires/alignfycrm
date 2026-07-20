import { useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Download, FileSpreadsheet, Upload, Users } from "lucide-react";
import { AlignPanel, AlignPanelFooter, AlignPanelSection } from "@/components/align-panel";
import { useImportLeads, type LeadRow } from "@/hooks/use-leads";
import {
  downloadLeadCsvTemplate,
  markExistingLeadDuplicates,
  MAX_LEAD_IMPORT_FILE_BYTES,
  parseLeadCsv,
  type ParsedLeadImportRow,
} from "@/lib/leads/csv-import";

export function LeadImportDialog({ leads }: { leads: LeadRow[] }) {
  const [open, setOpen] = useState(false);
  const [fileName, setFileName] = useState("");
  const [rows, setRows] = useState<ParsedLeadImportRow[]>([]);
  const [parseError, setParseError] = useState("");
  const [parsing, setParsing] = useState(false);
  const [skipDuplicates, setSkipDuplicates] = useState(true);
  const inputRef = useRef<HTMLInputElement>(null);
  const importer = useImportLeads();

  const analyzedRows = useMemo(() => markExistingLeadDuplicates(rows, leads), [rows, leads]);
  const invalidCount = analyzedRows.filter((row) => row.errors.length > 0).length;
  const duplicateCount = analyzedRows.filter((row) => row.duplicateReason).length;
  const importable = analyzedRows.filter(
    (row) => row.errors.length === 0 && (!skipDuplicates || !row.duplicateReason),
  );

  function reset() {
    setFileName("");
    setRows([]);
    setParseError("");
    setSkipDuplicates(true);
    if (inputRef.current) inputRef.current.value = "";
  }

  function close() {
    if (importer.isPending) return;
    setOpen(false);
    reset();
  }

  async function loadFile(file?: File) {
    if (!file) return;
    setParseError("");
    setRows([]);
    setFileName(file.name);
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setParseError("Selecione um arquivo com extensão .csv.");
      return;
    }
    if (file.size > MAX_LEAD_IMPORT_FILE_BYTES) {
      setParseError("O arquivo excede o limite de 5 MB.");
      return;
    }

    setParsing(true);
    try {
      setRows(parseLeadCsv(await file.arrayBuffer()));
    } catch (error) {
      setParseError(error instanceof Error ? error.message : "Não foi possível ler o CSV.");
    } finally {
      setParsing(false);
    }
  }

  async function importRows() {
    await importer.mutateAsync(importable.map((row) => row.value));
    close();
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-border bg-surface-1 px-3 text-sm text-muted-foreground hover:text-foreground"
      >
        <Upload className="h-3.5 w-3.5" /> Importar
      </button>

      <AlignPanel
        open={open}
        onClose={close}
        eyebrow="Leads"
        title="Importar arquivo CSV"
        subtitle="Revise os dados antes de adicioná-los ao CRM"
        widthClass="md:max-w-[760px]"
        footer={
          <AlignPanelFooter
            secondary={{ label: "Cancelar", onClick: close }}
            primary={{
              label: `Importar ${importable.length} lead${importable.length === 1 ? "" : "s"}`,
              onClick: importRows,
              loading: importer.isPending,
              disabled: importable.length === 0 || parsing,
            }}
          />
        }
      >
        <div className="space-y-6">
          <AlignPanelSection
            title="Arquivo"
            icon={FileSpreadsheet}
            action={
              <button
                type="button"
                onClick={downloadLeadCsvTemplate}
                className="inline-flex items-center gap-1 text-xs font-medium text-primary hover:underline"
              >
                <Download className="h-3 w-3" /> Baixar modelo
              </button>
            }
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,text/csv"
              className="hidden"
              onChange={(event) => loadFile(event.target.files?.[0])}
            />
            <button
              type="button"
              onClick={() => inputRef.current?.click()}
              onDragOver={(event) => event.preventDefault()}
              onDrop={(event) => {
                event.preventDefault();
                loadFile(event.dataTransfer.files?.[0]);
              }}
              className="flex min-h-36 w-full flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface-2 px-5 text-center transition hover:border-primary/50 hover:bg-primary/[0.03]"
            >
              <Upload className="mb-2 h-7 w-7 text-primary" />
              <span className="text-sm font-semibold">
                {parsing ? "Lendo arquivo…" : fileName || "Escolha ou arraste um CSV"}
              </span>
              <span className="mt-1 text-xs text-muted-foreground">
                Separadores vírgula ou ponto e vírgula · máximo 5 MB e 2.000 linhas
              </span>
            </button>
            {parseError && (
              <div className="flex gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /> {parseError}
              </div>
            )}
          </AlignPanelSection>

          {analyzedRows.length > 0 && (
            <>
              <AlignPanelSection title="Resumo" icon={Users}>
                <div className="grid grid-cols-3 gap-3">
                  <Metric label="Linhas lidas" value={analyzedRows.length} />
                  <Metric label="Duplicados" value={duplicateCount} tone="warn" />
                  <Metric label="Com erro" value={invalidCount} tone="danger" />
                </div>
                <label className="flex items-center gap-2 rounded-lg border border-border bg-surface-2 px-3 py-2.5 text-sm">
                  <input
                    type="checkbox"
                    checked={skipDuplicates}
                    onChange={(event) => setSkipDuplicates(event.target.checked)}
                    className="accent-primary"
                  />
                  Ignorar duplicados por e-mail, telefone ou nome/empresa
                </label>
              </AlignPanelSection>

              <AlignPanelSection title="Pré-visualização">
                <div className="overflow-hidden rounded-xl border border-border">
                  <div className="overflow-x-auto">
                    <table className="w-full min-w-[680px] text-left text-xs">
                      <thead className="border-b border-border bg-surface-2 text-[10px] uppercase tracking-wider text-muted-foreground">
                        <tr>
                          <th className="px-3 py-2.5">Linha</th>
                          <th className="px-3 py-2.5">Nome</th>
                          <th className="px-3 py-2.5">Empresa</th>
                          <th className="px-3 py-2.5">Contato</th>
                          <th className="px-3 py-2.5">Situação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {analyzedRows.slice(0, 12).map((row) => (
                          <tr key={row.rowNumber} className="bg-surface-1">
                            <td className="px-3 py-2.5 tabular-nums text-muted-foreground">
                              {row.rowNumber}
                            </td>
                            <td className="px-3 py-2.5 font-medium">{row.value.nome || "—"}</td>
                            <td className="px-3 py-2.5 text-muted-foreground">
                              {row.value.empresa || "—"}
                            </td>
                            <td className="px-3 py-2.5 text-muted-foreground">
                              {row.value.email || row.value.whatsapp || "—"}
                            </td>
                            <td className="px-3 py-2.5">
                              {row.errors.length > 0 ? (
                                <span className="text-destructive">{row.errors.join(" · ")}</span>
                              ) : row.duplicateReason ? (
                                <span className="text-warning">{row.duplicateReason}</span>
                              ) : (
                                <span className="inline-flex items-center gap-1 text-success">
                                  <CheckCircle2 className="h-3 w-3" /> Pronto
                                </span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {analyzedRows.length > 12 && (
                    <div className="border-t border-border bg-surface-2 px-3 py-2 text-center text-xs text-muted-foreground">
                      Prévia das primeiras 12 linhas · {analyzedRows.length - 12} adicionais
                    </div>
                  )}
                </div>
              </AlignPanelSection>
            </>
          )}
        </div>
      </AlignPanel>
    </>
  );
}

function Metric({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warn" | "danger";
}) {
  const valueClass =
    tone === "danger" ? "text-destructive" : tone === "warn" ? "text-warning" : "text-foreground";
  return (
    <div className="rounded-lg border border-border bg-surface-2 p-3">
      <div className={`text-xl font-bold tabular-nums ${valueClass}`}>{value}</div>
      <div className="mt-0.5 text-[10px] uppercase tracking-wider text-muted-foreground">
        {label}
      </div>
    </div>
  );
}
