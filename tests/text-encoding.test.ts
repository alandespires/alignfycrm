import { describe, expect, it } from "vitest";
import { hasMojibake, repairMojibake } from "@/lib/text-encoding";

describe("repairMojibake", () => {
  it.each([
    ["JosÃ©", "José"],
    ["ImÃ³veis", "Imóveis"],
    ["OfÃ­cio", "Ofício"],
    ["SÃ£o JoÃ£o", "São João"],
  ])("repairs %s", (input, expected) => {
    expect(repairMojibake(input)).toBe(expected);
    expect(hasMojibake(repairMojibake(input))).toBe(false);
  });

  it.each(["José", "Imóveis", "IRMÃOS", "MAÇÃ", "São João"])(
    "preserves valid text %s",
    (input) => expect(repairMojibake(input)).toBe(input),
  );
});
