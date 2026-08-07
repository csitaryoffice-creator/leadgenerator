import { describe, expect, it } from "vitest";
import { buildCsv } from "@/lib/export";
import type { BusinessRow } from "@/lib/data/businesses";

const row: BusinessRow = {
  id: "1",
  owner_id: "owner",
  google_place_id: "place",
  display_name: "Árvíz Kft.",
  primary_category: "bolt",
  categories: [],
  business_status: null,
  formatted_address: "Fő utca 1.",
  country: "Magyarország",
  region: "Budapest",
  city: "Budapest",
  phone_local: null,
  phone_international: "+36 30 123 4567",
  normalized_phone: "+36301234567",
  website_url: "https://example.hu",
  website_domain: "example.hu",
  google_maps_url: "https://maps.google.com",
  rating: 4.7,
  rating_count: 12,
  source: "google",
  email_count: 1,
  email_crawl_status: "found",
  email_crawl_checked_at: null,
  contact_page_url: "https://example.hu/kapcsolat",
  google_fetched_at: new Date().toISOString(),
  google_cache_expires_at: new Date(Date.now() + 60_000).toISOString(),
  field_sources: {},
  manual_overrides: {},
  notes: "Fontos",
  created_at: "2026-08-06T00:00:00.000Z",
  updated_at: "2026-08-06T00:00:00.000Z",
  deleted_at: null,
  business_emails: [{ id: "email", email: "info@example.hu", is_primary: true, source_url: "https://example.hu" }]
};

describe("export", () => {
  it("UTF-8 BOM-os CSV-t készít ékezetekkel és telefonszámmal", () => {
    const csv = buildCsv([row]);
    expect(csv.charCodeAt(0)).toBe(0xfeff);
    expect(csv).toContain("Árvíz Kft.");
    expect(csv).toContain("+36 30 123 4567");
    expect(csv).toContain("info@example.hu");
  });

  it("lejárt Google-mezőt kihagy", () => {
    const csv = buildCsv([{ ...row, google_cache_expires_at: "2020-01-01T00:00:00.000Z" }]);
    expect(csv).not.toContain("Árvíz Kft.");
    expect(csv).toContain("info@example.hu");
  });
});
