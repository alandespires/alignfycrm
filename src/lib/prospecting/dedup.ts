import { normalizePhone, normalizeEmail, extractDomain } from "./normalize";
import type { RawLead } from "./types";

export type DedupLevel = "confirmada" | "possivel" | "novo";
export type ExistingLead = { id: string; nome: string; email: string | null; whatsapp: string | null; empresa: string | null };

export function detectDuplicate(raw: RawLead, existing: ExistingLead[]): { level: DedupLevel; leadId?: string; motivo?: string } {
  const phone = normalizePhone(raw.telefone ?? raw.whatsapp);
  const email = normalizeEmail(raw.email);
  const domain = extractDomain(raw.site);
  const nome = raw.nome.trim().toLowerCase();

  for (const l of existing) {
    const lPhone = normalizePhone(l.whatsapp);
    const lEmail = normalizeEmail(l.email);
    if (phone && lPhone && phone === lPhone) return { level: "confirmada", leadId: l.id, motivo: "Telefone idêntico" };
    if (email && lEmail && email === lEmail) return { level: "confirmada", leadId: l.id, motivo: "E-mail idêntico" };
    const lEmpresa = (l.empresa ?? l.nome ?? "").toLowerCase();
    if (nome && lEmpresa && (nome === lEmpresa || lEmpresa.includes(nome) || nome.includes(lEmpresa))) {
      return { level: "possivel", leadId: l.id, motivo: "Nome de empresa similar" };
    }
    if (domain && l.email && lEmail && lEmail.endsWith("@" + domain)) {
      return { level: "possivel", leadId: l.id, motivo: "Mesmo domínio de e-mail" };
    }
  }
  return { level: "novo" };
}
