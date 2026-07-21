import { describe, expect, it } from "vitest";
import { getWhatsAppPreflightBlockReason } from "../src/lib/whatsapp-policy";

describe("WhatsApp preflight policy", () => {
  it("requires the global kill switch to be enabled", () => {
    expect(getWhatsAppPreflightBlockReason({ enabled: false, consent: "granted", leadId: "lead-1", phone: "5511999999999" })).toMatch(/desabilitado/);
  });

  it("requires an auditable lead and explicit consent", () => {
    expect(getWhatsAppPreflightBlockReason({ enabled: true, consent: "granted", phone: "5511999999999" })).toMatch(/vínculo/);
    expect(getWhatsAppPreflightBlockReason({ enabled: true, consent: "unknown", leadId: "lead-1", phone: "5511999999999" })).toMatch(/consentimento/);
  });

  it("allows only a valid, consented and auditable contact", () => {
    expect(getWhatsAppPreflightBlockReason({ enabled: true, consent: "granted", leadId: "lead-1", phone: "+55 11 99999-9999" })).toBeNull();
  });
});
