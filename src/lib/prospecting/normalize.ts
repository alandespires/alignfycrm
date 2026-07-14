// Normalização de dados de contato para dedup e validação.
export function normalizePhone(v?: string | null): string | null {
  if (!v) return null;
  const digits = v.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return null;
  // Adiciona DDI 55 quando ausente (Brasil).
  return digits.length <= 11 ? "55" + digits : digits;
}

export function normalizeEmail(v?: string | null): string | null {
  if (!v) return null;
  const t = v.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(t) ? t : null;
}

export function extractDomain(url?: string | null): string | null {
  if (!url) return null;
  try {
    const withProto = /^https?:\/\//i.test(url) ? url : `https://${url}`;
    const u = new URL(withProto);
    return u.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function isDisposableEmail(email?: string | null): boolean {
  if (!email) return false;
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  const disposables = ["mailinator.com", "10minutemail.com", "tempmail.com", "guerrillamail.com", "yopmail.com", "throwaway.email"];
  return disposables.includes(domain);
}
