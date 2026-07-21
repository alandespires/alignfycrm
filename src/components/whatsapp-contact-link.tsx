import { useState, type ReactNode } from "react";
import { toast } from "sonner";
import { featureFlags } from "@/lib/feature-flags";
import { supabase } from "@/integrations/supabase/client";
import { getWhatsAppPreflightBlockReason } from "@/lib/whatsapp-policy";

export type WhatsAppConsent = "granted" | "revoked" | "unknown";

export function WhatsAppContactLink({
  phone,
  leadId,
  consent = "unknown",
  className,
  children,
  title = "WhatsApp",
}: {
  phone: string;
  leadId?: string;
  consent?: WhatsAppConsent;
  className?: string;
  children: ReactNode;
  title?: string;
}) {
  const [authorizing, setAuthorizing] = useState(false);
  const normalized = phone.replace(/\D/g, "");
  const blockReason = getWhatsAppPreflightBlockReason({ enabled: featureFlags.whatsappContact, consent, leadId, phone });
  const allowed = blockReason === null;

  if (allowed) {
    return (
      <button
        type="button"
        disabled={authorizing}
        className={className}
        title={title}
        aria-label={title}
        onClick={async (event) => {
          event.stopPropagation();
          setAuthorizing(true);
          const popup = window.open("", "_blank");
          const { data, error } = await supabase.rpc("authorize_whatsapp_contact", { _lead_id: leadId });
          setAuthorizing(false);
          const result = data as { allowed?: boolean; phone?: string; reason?: string } | null;
          if (error || !result?.allowed || !result.phone) {
            popup?.close();
            toast.error(result?.reason || error?.message || "Contato bloqueado pelas regras de WhatsApp");
            return;
          }
          const url = `https://wa.me/${result.phone}`;
          if (popup) popup.location.href = url;
          else window.location.assign(url);
        }}
      >
        {children}
      </button>
    );
  }

  const reason = blockReason ?? "Contato bloqueado pelas regras de WhatsApp.";

  return (
    <button
      type="button"
      className={`${className ?? ""} cursor-not-allowed opacity-50`}
      title={reason}
      aria-label={`${title} indisponível: ${reason}`}
      onClick={(event) => {
        event.stopPropagation();
        toast.warning(reason);
      }}
    >
      {children}
    </button>
  );
}
