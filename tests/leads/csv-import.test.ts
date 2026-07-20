import { describe, expect, it } from "vitest";
import { markExistingLeadDuplicates, parseLeadCsv } from "../../src/lib/leads/csv-import";
import type { LeadRow } from "../../src/hooks/use-leads";

function csvBuffer(content: string) {
  return new TextEncoder().encode(`\ufeff${content}`).buffer as ArrayBuffer;
}

describe("importação CSV de leads", () => {
  it("aceita cabeçalhos em português e converte valores brasileiros", () => {
    const [row] = parseLeadCsv(
      csvBuffer(
        [
          "Nome;Empresa;E-mail;Telefone;Etapa;Valor estimado;Tags",
          'Maria Silva;Acme;MARIA@ACME.COM;(11) 99999-1234;Qualificação;"1.500,50";vip|evento',
        ].join("\n"),
      ),
    );

    expect(row.errors).toEqual([]);
    expect(row.value).toMatchObject({
      nome: "Maria Silva",
      empresa: "Acme",
      email: "maria@acme.com",
      whatsapp: "5511999991234",
      status: "qualificacao",
      valor_estimado: 1500.5,
      tags: ["vip", "evento"],
    });
  });

  it("informa erros por linha sem impedir a pré-visualização", () => {
    const rows = parseLeadCsv(
      csvBuffer("nome,email,telefone,status,valor\n,ruim,123,etapa inexistente,-20"),
    );

    expect(rows[0].rowNumber).toBe(2);
    expect(rows[0].errors).toEqual([
      "Nome obrigatório",
      "E-mail inválido",
      "Telefone inválido",
      "Status inválido",
      "Valor inválido",
    ]);
  });

  it("marca duplicados no arquivo e no CRM por qualquer contato", () => {
    const rows = parseLeadCsv(
      csvBuffer(
        [
          "nome,email,telefone",
          "Primeiro,primeiro@teste.com,11999991234",
          "Segundo,segundo@teste.com,11999991234",
        ].join("\n"),
      ),
    );
    expect(rows[1].duplicateReason).toBe("Duplicado no arquivo");

    const existing = [
      {
        nome: "Outro nome",
        empresa: null,
        email: "outro@teste.com",
        whatsapp: "11999991234",
        status: "novo",
      },
    ] as LeadRow[];
    expect(markExistingLeadDuplicates(rows, existing)[0].duplicateReason).toBe("Já existe no CRM");
  });
});
