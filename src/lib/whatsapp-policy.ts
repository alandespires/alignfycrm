import type { WhatsAppConsent } from "@/components/whatsapp-contact-link";

export function getWhatsAppPreflightBlockReason({
  enabled,
  consent,
  leadId,
  phone,
}: {
  enabled: boolean;
  consent: WhatsAppConsent;
  leadId?: string;
  phone: string;
}): string | null {
  if (!enabled) return "Contato por WhatsApp temporariamente desabilitado pelo administrador.";
  if (!leadId) return "Contato indisponível sem vínculo auditável com um lead.";
  if (consent === "revoked") return "O contato bloqueou mensagens pelo WhatsApp.";
  if (consent !== "granted") return "Contato pelo WhatsApp indisponível até que o consentimento seja registrado.";
  if (phone.replace(/\D/g, "").length < 10) return "Número de WhatsApp inválido.";
  return null;
}
