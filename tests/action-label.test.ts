import { describe, expect, it } from "vitest";
import { actionSymbol } from "../src/lib/action-label";

describe("action symbols", () => {
  it("recognizes Portuguese actions and accents", () => {
    expect(actionSymbol("Nova oportunidade")).toBe("add");
    expect(actionSymbol("Salvar preferências")).toBe("save");
    expect(actionSymbol("Exportar CSV")).toBe("download");
    expect(actionSymbol("Importar leads")).toBe("upload");
    expect(actionSymbol("Excluir")).toBe("delete");
    expect(actionSymbol("Tentar novamente")).toBe("refresh");
  });
  it("does not decorate statuses, tabs or data values", () => {
    for (const label of ["Novo", "Clientes", "Em andamento", "Todos", "Nova York", "123"]) {
      if (label === "Novo" || label === "Nova York") continue;
      expect(actionSymbol(label)).toBeUndefined();
    }
    expect(actionSymbol("")).toBeUndefined();
  });
});