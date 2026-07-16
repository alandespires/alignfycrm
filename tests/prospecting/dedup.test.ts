import { describe, expect, it } from "vitest";
import { deduplicate } from "../../supabase/functions/_shared/prospecting/dedup";

const existing = [
  {
    id: "lead-1",
    nome: "Clínica São José",
    empresa: "Clínica São José LTDA",
    email: "contato@clinicasaojose.com.br",
    whatsapp: "+55 11 99999-1234",
    identifiers: [{ kind: "dominio", value: "clinicasaojose.com.br" }],
  },
];

describe("deduplicação de prospecção", () => {
  it("confirma duplicidade por contato exato", () => {
    const result = deduplicate(
      { nome: "Outro nome", whatsapp: "11999991234", source: "test", is_demo: false },
      existing,
    );
    expect(result.level).toBe("confirmada");
    expect(result.matchedLeadId).toBe("lead-1");
  });

  it("marca nome empresarial semelhante como possível", () => {
    const result = deduplicate(
      { nome: "Clínica São José", source: "test", is_demo: false },
      existing,
    );
    expect(result.level).toBe("possivel");
  });

  it("mantém contato sem correspondência como novo", () => {
    const result = deduplicate(
      { nome: "Empresa Nova", email: "novo@empresa.test", source: "test", is_demo: false },
      existing,
    );
    expect(result.level).toBe("novo");
  });
});
