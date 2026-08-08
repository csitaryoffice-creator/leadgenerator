import { describe, expect, it } from "vitest";
import { PLACE_SEARCH_FIELD_MASK, normalizeGooglePlace } from "@/lib/google/places";
import type { GoogleAddressComponent, GooglePlace } from "@/lib/google/types";

function googlePlace(addressComponents?: GoogleAddressComponent[]): GooglePlace {
  return {
    id: "place-1",
    displayName: { text: "Fodrasz" },
    formattedAddress: "Szekesfehervar, Hungary",
    addressComponents
  };
}

describe("Google Places address normalization", () => {
  it("requests address components in the text search field mask", () => {
    expect(PLACE_SEARCH_FIELD_MASK).toContain("places.addressComponents");
  });

  it("keeps country null when Google omits the country component", () => {
    const place = normalizeGooglePlace(
      googlePlace([
        { longText: "Fejer County", types: ["administrative_area_level_1"] },
        { longText: "Szekesfehervar", types: ["locality"] }
      ])
    );

    expect(place).not.toBeNull();
    expect(place?.country).toBeNull();
    expect(place?.region).toBe("Fejer County");
    expect(place?.city).toBe("Szekesfehervar");
  });

  it("keeps region null when Google omits administrative area components", () => {
    const place = normalizeGooglePlace(
      googlePlace([
        { longText: "Hungary", types: ["country"] },
        { longText: "Szekesfehervar", types: ["locality"] }
      ])
    );

    expect(place).not.toBeNull();
    expect(place?.country).toBe("Hungary");
    expect(place?.region).toBeNull();
    expect(place?.city).toBe("Szekesfehervar");
  });

  it("keeps geography fields null when Google omits addressComponents", () => {
    const place = normalizeGooglePlace(googlePlace());

    expect(place).not.toBeNull();
    expect(place?.country).toBeNull();
    expect(place?.region).toBeNull();
    expect(place?.city).toBeNull();
  });
});
