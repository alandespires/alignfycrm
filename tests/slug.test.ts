import { describe, expect, it, vi } from "vitest";
import { createUniqueSlug, slugify } from "@/lib/slug";

describe("slugify", () => {
  it("normalizes accents, spacing and punctuation", () => {
    expect(slugify("  Política de Férias & Ausências!  ")).toBe("politica-de-ferias-ausencias");
  });

  it("creates a non-empty, unique article slug", () => {
    vi.spyOn(crypto, "randomUUID").mockReturnValue("12345678-1234-4234-8234-123456789abc");

    expect(createUniqueSlug("Novo artigo")).toBe("novo-artigo-12345678");
    expect(createUniqueSlug("!!!")).toBe("artigo-12345678");
  });
});
