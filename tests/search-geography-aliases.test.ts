import { describe, expect, it } from "vitest";
import { normalizeGooglePlace } from "@/lib/google/places";
import { geographyMatches, websiteConditionMatches } from "@/lib/search/jobs";

function place(country: string, region: string) {
  const normalized = normalizeGooglePlace({
    id: `${country}-${region}`,
    displayName: { text: "Fodrász" },
    formattedAddress: `${region}, ${country}`,
    addressComponents: [
      { longText: country, types: ["country"] },
      { longText: region, types: ["administrative_area_level_1"] }
    ]
  });

  if (!normalized) {
    throw new Error("The Google place fixture must normalize.");
  }

  return normalized;
}

describe("search geography aliases", () => {
  it("accepts a formatted Hungarian address when Google omits region and city components", () => {
    const normalized = normalizeGooglePlace({
      id: "place-szekesfehervar",
      displayName: { text: "Fodrász" },
      formattedAddress: "8000 Székesfehérvár, Hungary"
    });

    expect(normalized).not.toBeNull();
    expect(normalized?.country).toBeNull();
    expect(normalized?.region).toBeNull();
    expect(normalized?.city).toBeNull();
    expect(geographyMatches(normalized!, {
      country: "Hungary",
      region: "Fejér",
      city: "Székesfehérvár"
    })).toBe(true);
  });

  it.each(["Hungary", "Magyarország", "HU"])("matches country alias %s", (actualCountry) => {
    for (const expectedCountry of ["Hungary", "Magyarország", "HU"]) {
      expect(geographyMatches(place(actualCountry, "Fejér"), {
        country: expectedCountry,
        region: "Fejér",
        city: null
      })).toBe(true);
    }
  });

  it.each(["Fejér", "Fejér County", "Fejér vármegye"])("matches region alias %s", (actualRegion) => {
    for (const expectedRegion of ["Fejér", "Fejér County", "Fejér vármegye"]) {
      const normalized = place("Hungary", actualRegion);
      expect(geographyMatches(normalized, {
        country: "Magyarország",
        region: expectedRegion,
        city: null
      })).toBe(true);
      expect(websiteConditionMatches(normalized, "any")).toBe(true);
    }
  });
});
