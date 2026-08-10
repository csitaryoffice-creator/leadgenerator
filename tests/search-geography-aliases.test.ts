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
