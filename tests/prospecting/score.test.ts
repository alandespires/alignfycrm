import { describe, expect, it } from "vitest";
import { scoreLead } from "../../supabase/functions/_shared/prospecting/score";

describe("score de prospecção", () => {
  it("respeita limites e gera breakdown explicável", () => {
    const result = scoreLead(
      {
        nome: "Empresa Completa",
        segmento: "Odontologia",
        cidade: "São Paulo",
        uf: "SP",
        telefone: "11999991234",
        whatsapp: "11999991234",
        email: "contato@empresa.com",
        site: "https://empresa.com",
        instagram: "@empresa",
        linkedin: "empresa",
        rating: 4.8,
        reviews_count: 120,
        activity_recent: true,
        source: "test",
        is_demo: false,
      },
      { nicho: "Odontologia", cidade: "São Paulo" },
    );
    expect(result.score).toBe(100);
    expect(result.tier).toBe("excelente");
    expect(result.breakdown).toHaveLength(12);
    expect(result.breakdown.reduce((sum, item) => sum + item.points, 0)).toBe(100);
  });

  it("classifica lead com poucos dados como baixo", () => {
    const result = scoreLead(
      { nome: "Lead incompleto", source: "test", is_demo: false },
      { nicho: "Restaurante" },
    );
    expect(result.score).toBeLessThan(50);
    expect(result.tier).toBe("baixo");
    expect(result.attention.length).toBeGreaterThan(0);
  });

  it("aceita pesos configuráveis", () => {
    const result = scoreLead(
      { nome: "Com telefone", telefone: "11999991234", source: "test", is_demo: false },
      {},
      { telefone: 80 },
    );
    expect(result.score).toBe(80);
  });
});
