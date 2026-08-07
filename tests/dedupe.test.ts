import { describe, expect, it } from "vitest";
import { scoreDuplicate } from "@/lib/dedupe";

describe("duplikáció felismerés", () => {
  it("Place ID alapján biztos egyezést ad", () => {
    const result = scoreDuplicate({ googlePlaceId: "abc" }, { id: "1", googlePlaceId: "abc" });
    expect(result.decision).toBe("exact");
    expect(result.score).toBe(100);
  });

  it("heurisztikus egyezést talál weboldal, telefon és név alapján", () => {
    const result = scoreDuplicate(
      { displayName: "Példa Kft.", phone: "+36 30 123 4567", websiteUrl: "https://pelda.hu" },
      { id: "1", displayName: "Pelda Kft", phone: "06301234567", websiteUrl: "http://www.pelda.hu" }
    );
    expect(result.decision).toBe("possible");
    expect(result.score).toBeGreaterThanOrEqual(35);
  });
});
