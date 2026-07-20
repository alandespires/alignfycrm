import * as XLSX from "xlsx";
import type { LeadRow, LeadStatus } from "@/hooks/use-leads";
import { normalizeEmail, normalizePhone } from "@/lib/prospecting/normalize";

export const MAX_LEAD_IMPORT_ROWS = 2_000;
export const MAX_LEAD_IMPORT_FILE_BYTES = 5 * 1024 * 1024;

export type LeadImportValue = {
  nome: string;
  empresa?: string;
  email?: string;
  whatsapp?: string;
  origem?: string;
  interesse?: string;
  observacoes?: string;
  tags?: string[];
  status: LeadStatus;
  valor_estimado?: number;
};

export type ParsedLeadImportRow = {
  rowNumber: number;
  value: LeadImportValue;
  errors: string[];
  duplicateReason?: string;
};

const HEADER_ALIASES = {
  nome: ["nome", "name", "contato", "nome do lead", "lead"],
  empresa: ["empresa", "company", "organizacao", "organização", "razao social", "razão social"],
  email: ["email", "e-mail", "mail"],
  whatsapp: ["whatsapp", "telefone", "phone", "celular", "fone"],
  origem: ["origem", "source", "fonte"],
  interesse: ["interesse", "interest", "produto", "servico", "serviço"],
  observacoes: ["observacoes", "observações", "observacao", "observação", "notes", "notas"],
  tags: ["tags", "etiquetas", "marcadores"],
  status: ["status", "etapa", "stage", "fase"],
  valor_estimado: ["valor estimado", "valor_estimado", "valor", "value", "estimated value"],
} as const;

const STATUS_ALIASES: Record<string, LeadStatus> = {
  novo: "novo",
  "novo lead": "novo",
  new: "novo",
  contato: "contato_inicial",
  "em contato": "contato_inicial",
  "contato inicial": "contato_inicial",
  contato_inicial: "contato_inicial",
  qualificacao: "qualificacao",
  qualificação: "qualificacao",
  qualificado: "qualificacao",
  qualified: "qualificacao",
  proposta: "proposta",
  proposal: "proposta",
  negociacao: "negociacao",
  negociação: "negociacao",
  negotiation: "negociacao",
  fechado: "fechado",
  convertido: "fechado",
  won: "fechado",
  perdido: "perdido",
  lost: "perdido",
};

function normalizeText(value: unknown) {
  return String(value ?? "")
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[_-]+/g, " ")
    .replace(/\s+/g, " ");
}

function cellText(value: unknown) {
  return String(value ?? "").trim();
}

function parseMoney(value: string): number | undefined {
  if (!value) return undefined;
  const clean = value.replace(/R\$/gi, "").replace(/\s/g, "");
  const normalized = clean.includes(",") ? clean.replace(/\./g, "").replace(",", ".") : clean;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : undefined;
}

function rowFingerprints(value: LeadImportValue) {
  const fingerprints: string[] = [];
  const email = normalizeEmail(value.email);
  if (email) fingerprints.push(`email:${email}`);
  const phone = normalizePhone(value.whatsapp);
  if (phone) fingerprints.push(`telefone:${phone}`);
  const name = normalizeText(value.nome);
  const company = normalizeText(value.empresa);
  if (name) fingerprints.push(`nome:${name}|${company}`);
  return fingerprints;
}

export function parseLeadCsv(data: ArrayBuffer): ParsedLeadImportRow[] {
  const workbook = XLSX.read(data, { type: "array", raw: false });
  const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
  if (!firstSheet) throw new Error("O CSV não contém uma planilha válida.");

  const matrix = XLSX.utils.sheet_to_json<unknown[]>(firstSheet, {
    header: 1,
    defval: "",
    raw: false,
    blankrows: false,
  });
  if (matrix.length < 2) throw new Error("O CSV precisa ter cabeçalho e pelo menos uma linha.");

  const headers = matrix[0].map(normalizeText);
  const indexes = Object.fromEntries(
    Object.entries(HEADER_ALIASES).map(([field, aliases]) => [
      field,
      headers.findIndex((header) => aliases.some((alias) => normalizeText(alias) === header)),
    ]),
  ) as Record<keyof typeof HEADER_ALIASES, number>;

  if (indexes.nome < 0) {
    throw new Error('Cabeçalho obrigatório não encontrado. Use uma coluna chamada "nome".');
  }

  const sourceRows = matrix.slice(1);
  if (sourceRows.length > MAX_LEAD_IMPORT_ROWS) {
    throw new Error(
      `O CSV excede o limite de ${MAX_LEAD_IMPORT_ROWS.toLocaleString("pt-BR")} linhas.`,
    );
  }

  const get = (row: unknown[], field: keyof typeof HEADER_ALIASES) =>
    indexes[field] >= 0 ? cellText(row[indexes[field]]) : "";

  const parsed = sourceRows
    .map((row, index): ParsedLeadImportRow | null => {
      const values = row.map(cellText);
      if (values.every((value) => !value)) return null;

      const nome = get(row, "nome");
      const emailRaw = get(row, "email");
      const phoneRaw = get(row, "whatsapp");
      const statusRaw = get(row, "status");
      const moneyRaw = get(row, "valor_estimado");
      const email = normalizeEmail(emailRaw) ?? undefined;
      const whatsapp = normalizePhone(phoneRaw) ?? undefined;
      const status = statusRaw ? STATUS_ALIASES[normalizeText(statusRaw)] : "novo";
      const valorEstimado = parseMoney(moneyRaw);
      const errors: string[] = [];

      if (!nome) errors.push("Nome obrigatório");
      if (emailRaw && !email) errors.push("E-mail inválido");
      if (phoneRaw && !whatsapp) errors.push("Telefone inválido");
      if (statusRaw && !status) errors.push("Status inválido");
      if (moneyRaw && valorEstimado === undefined) errors.push("Valor inválido");

      return {
        rowNumber: index + 2,
        value: {
          nome,
          empresa: get(row, "empresa") || undefined,
          email,
          whatsapp,
          origem: get(row, "origem") || "Importação CSV",
          interesse: get(row, "interesse") || undefined,
          observacoes: get(row, "observacoes") || undefined,
          tags: get(row, "tags")
            ? get(row, "tags")
                .split(/[|,]/)
                .map((tag) => tag.trim())
                .filter(Boolean)
                .slice(0, 20)
            : undefined,
          status: status ?? "novo",
          valor_estimado: valorEstimado,
        },
        errors,
      };
    })
    .filter((row): row is ParsedLeadImportRow => row !== null);

  const seen = new Set<string>();
  for (const row of parsed) {
    const fingerprints = rowFingerprints(row.value);
    if (fingerprints.some((fingerprint) => seen.has(fingerprint))) {
      row.duplicateReason = "Duplicado no arquivo";
    }
    fingerprints.forEach((fingerprint) => seen.add(fingerprint));
  }
  return parsed;
}

export function markExistingLeadDuplicates(rows: ParsedLeadImportRow[], leads: LeadRow[]) {
  const existing = new Set(
    leads.flatMap((lead) => {
      const fingerprints = [
        normalizeEmail(lead.email) ? `email:${normalizeEmail(lead.email)}` : null,
        normalizePhone(lead.whatsapp) ? `telefone:${normalizePhone(lead.whatsapp)}` : null,
        ...rowFingerprints({
          nome: lead.nome,
          empresa: lead.empresa ?? undefined,
          status: lead.status,
        }).filter((fingerprint) => fingerprint.startsWith("nome:")),
      ];
      return fingerprints.filter((value): value is string => Boolean(value));
    }),
  );

  return rows.map((row) => {
    const duplicate = rowFingerprints(row.value).some((fingerprint) => existing.has(fingerprint));
    return duplicate ? { ...row, duplicateReason: "Já existe no CRM" } : row;
  });
}

export function downloadLeadCsvTemplate() {
  const content = [
    "nome;empresa;email;whatsapp;origem;interesse;status;valor_estimado;tags;observacoes",
    "Maria Silva;Empresa Exemplo;contato@exemplo.com.br;11999999999;Indicação;Consultoria;novo;1500,00;vip|evento;Contato inicial",
  ].join("\r\n");
  const url = URL.createObjectURL(
    new Blob(["\ufeff", content], { type: "text/csv;charset=utf-8" }),
  );
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = "modelo-importacao-leads.csv";
  anchor.click();
  URL.revokeObjectURL(url);
}
