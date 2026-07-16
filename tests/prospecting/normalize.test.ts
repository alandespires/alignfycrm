import { describe, expect, it } from "vitest";
import {
  extractDomain,
  normalizeCnpj,
  normalizeEmail,
  normalizePhone,
  normalizeText,
} from "../../supabase/functions/_shared/prospecting/normalize";

describe("normalização de prospecção", () => {
  it("normaliza telefone brasileiro e preserva DDI", () => {
    expect(normalizePhone("(11) 99999-1234")).toBe("5511999991234");
    expect(normalizePhone("+55 11 99999-1234")).toBe("5511999991234");
    expect(normalizePhone("123")).toBeNull();
  });

  it("normaliza e valida e-mail, CNPJ e domínio", () => {
    expect(normalizeEmail(" Contato@Empresa.COM ")).toBe("contato@empresa.com");
    expect(normalizeEmail("invalido")).toBeNull();
    expect(normalizeCnpj("12.345.678/0001-90")).toBe("12345678000190");
    expect(extractDomain("https://www.Exemplo.com.br/pagina")).toBe("exemplo.com.br");
  });

  it("remove acentos e sufixos societários do nome", () => {
    expect(normalizeText("Clínica São José LTDA")).toBe("clinica sao jose");
  });
});
