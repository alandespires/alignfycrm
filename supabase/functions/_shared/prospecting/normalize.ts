export function normalizePhone(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  if (digits.length < 10 || digits.length > 13) return null;
  return digits.length <= 11 ? `55${digits}` : digits;
}

export function normalizeEmail(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalized) ? normalized : null;
}

export function normalizeCnpj(value?: string | null): string | null {
  if (!value) return null;
  const digits = value.replace(/\D/g, "");
  return digits.length === 14 ? digits : null;
}

export function extractDomain(value?: string | null): string | null {
  if (!value) return null;
  try {
    const url = new URL(/^https?:\/\//i.test(value) ? value : `https://${value}`);
    return url.hostname.replace(/^www\./, "").toLowerCase();
  } catch {
    return null;
  }
}

export function normalizeText(value?: string | null): string {
  return (value ?? "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\b(ltda|me|eireli|sa|s a)\b/g, " ")
    .replace(/[^a-z0-9]+/g, " ")
    .trim()
    .replace(/\s+/g, " ");
}

export function normalizeSocial(value?: string | null): string | null {
  if (!value) return null;
  const normalized = value.trim().toLowerCase().replace(/^@/, "").replace(/\/$/, "");
  return normalized || null;
}

export function isDisposableEmail(email?: string | null): boolean {
  const domain = email?.split("@")[1]?.toLowerCase();
  return (
    !!domain &&
    [
      "mailinator.com",
      "10minutemail.com",
      "tempmail.com",
      "guerrillamail.com",
      "yopmail.com",
      "throwaway.email",
    ].includes(domain)
  );
}
