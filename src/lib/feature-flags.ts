function enabled(value: unknown): boolean {
  return String(value).toLowerCase() === "true";
}

export const featureFlags = {
  whatsappContact: enabled(import.meta.env.VITE_WHATSAPP_CONTACT_ENABLED),
} as const;
