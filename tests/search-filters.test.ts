import { describe, expect, it } from "vitest";
import { geographyMatches, websiteConditionMatches } from "@/lib/search/jobs";
import type { NormalizedPlace } from "@/lib/google/types";

const basePlace: NormalizedPlace = {
  google_place_id: "place-1",
  google_resource_name: null,
  display_name: "Teszt Kft.",
  primary_category: null,
  categories: [],
  business_status: null,
  formatted_address: "Budapest, Magyarország",
  country: "Magyarország",
  region: "Budapest",
  city: "Budapest",
  postal_code: null,
  street: null,
  street_number: null,
  phone_local: null,
  phone_international: null,
  website_url: "https://example.hu",
  website_domain: "example.hu",
  google_maps_url: null,
  rating: null,
  rating_count: null,
  latitude: null,
  longitude: null,
  source: "google",
  google_fetched_at: new Date().toISOString(),
  google_cache_expires_at: new Date(Date.now() + 1000).toISOString(),
  field_sources: {}
};

describe("keresési szűrők", () => {
  it("ellenőrzi a földrajzi feltételeket", () => {
    expect(geographyMatches(basePlace, { country: "Magyarország", region: "Budapest", city: "Budapest" })).toBe(true);
    expect(geographyMatches(basePlace, { country: "Magyarország", region: "Pest", city: null })).toBe(false);
  });

  it("kezeli a Google-rekord weboldal feltételét", () => {
    expect(websiteConditionMatches(basePlace, "with_website")).toBe(true);
    expect(websiteConditionMatches(basePlace, "without_google_website")).toBe(false);
    expect(websiteConditionMatches({ ...basePlace, website_url: null }, "without_google_website")).toBe(true);
  });
});
