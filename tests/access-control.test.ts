import { describe, expect, it } from "vitest";
import { canAccessPath } from "../src/lib/access-control";

describe("route access by segment", () => {
  it("blocks clinic and school routes for a general workspace", () => {
    expect(canAccessPath("/clinicas", "geral", false)).toBe(false);
    expect(canAccessPath("/escolar/alunos", "geral", false)).toBe(false);
    expect(canAccessPath("/portal-aluno", "geral", false)).toBe(false);
  });

  it("allows only the matching vertical", () => {
    expect(canAccessPath("/clinicas/agenda", "clinica", false)).toBe(true);
    expect(canAccessPath("/escolar/turmas", "clinica", false)).toBe(false);
    expect(canAccessPath("/escolar/turmas", "escolar", false)).toBe(true);
  });

  it("protects super admin independently of segment", () => {
    expect(canAccessPath("/super-admin", "geral", false)).toBe(false);
    expect(canAccessPath("/super-admin", "geral", true)).toBe(true);
  });
});
