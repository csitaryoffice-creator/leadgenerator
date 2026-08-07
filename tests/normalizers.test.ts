import { describe, expect, it } from "vitest";
import { normalizeComparableText, normalizeDomain, normalizeEmail, normalizePhone, normalizeUrl } from "@/lib/normalizers";

describe("normalizálók", () => {
  it("normalizálja a telefonszámokat", () => {
    expect(normalizePhone("+36 30 123 4567")).toBe("+36301234567");
    expect(normalizePhone("12")).toBeNull();
  });

  it("normalizálja az URL-t és a regisztrálható domaint", () => {
    expect(normalizeUrl("example.hu/kapcsolat")).toBe("https://example.hu/kapcsolat");
    expect(normalizeDomain("https://www.example.co.uk/a")).toBe("example.co.uk");
  });

  it("e-mailt és összehasonlítható magyar szöveget normalizál", () => {
    expect(normalizeEmail(" INFO@PÉLDA.HU ")).toBe("info@példa.hu");
    expect(normalizeComparableText("Árvíztűrő   Tükörfúrógép")).toBe("arvizturo tukorfurogep");
  });
});
