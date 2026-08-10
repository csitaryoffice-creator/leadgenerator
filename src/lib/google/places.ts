import { getServerEnv } from "@/lib/env";
import { normalizeComparableText, normalizeDomain, normalizePhone, normalizeUrl } from "@/lib/normalizers";
import { reserveGoogleApiCall } from "@/lib/google/usage";
import type { GoogleAddressComponent, GooglePlace, GoogleViewport, NormalizedPlace } from "@/lib/google/types";

const TEXT_SEARCH_ENDPOINT = "https://places.googleapis.com/v1/places:searchText";
const DETAILS_ENDPOINT = "https://places.googleapis.com/v1/places";

export const PLACE_SEARCH_FIELD_MASK = [
  "places.id",
  "places.name",
  "places.displayName",
  "places.primaryType",
  "places.types",
  "places.businessStatus",
  "places.formattedAddress",
  "places.addressComponents",
  "places.nationalPhoneNumber",
  "places.internationalPhoneNumber",
  "places.websiteUri",
  "places.googleMapsUri",
  "places.rating",
  "places.userRatingCount",
  "places.location",
  "places.viewport"
].join(",");

export const PLACE_DETAILS_FIELD_MASK = PLACE_SEARCH_FIELD_MASK.replaceAll("places.", "");

type SearchTextInput = {
  ownerId: string;
  query: string;
  maxResultCount?: number;
  locationRestriction?: {
    rectangle: GoogleViewport;
  };
};

type ResolveAreaInput = {
  ownerId: string;
  country: string;
  region?: string | null;
  city?: string | null;
};

function component(components: GoogleAddressComponent[] | undefined, type: string) {
  const match = components?.find((item) => item.types?.includes(type));
  return match?.longText ?? match?.shortText ?? null;
}

function firstComponent(components: GoogleAddressComponent[] | undefined, types: string[]) {
  for (const type of types) {
    const found = component(components, type);
    if (found) {
      return found;
    }
  }
  return null;
}

export function normalizeGooglePlace(place: GooglePlace): NormalizedPlace | null {
  if (!place.id || !place.displayName?.text) {
    return null;
  }

  const fetchedAt = new Date();
  const expiresAt = new Date(fetchedAt.getTime() + 30 * 24 * 60 * 60 * 1000);
  const websiteUrl = normalizeUrl(place.websiteUri);
  const fieldMeta = {
    source: "google" as const,
    fetchedAt: fetchedAt.toISOString(),
    expiresAt: expiresAt.toISOString()
  };

  return {
    google_place_id: place.id,
    google_resource_name: place.name ?? null,
    display_name: place.displayName.text,
    primary_category: place.primaryType ?? place.types?.[0] ?? null,
    categories: place.types ?? [],
    business_status: place.businessStatus ?? null,
    formatted_address: place.formattedAddress ?? null,
    country: component(place.addressComponents, "country"),
    region: firstComponent(place.addressComponents, ["administrative_area_level_1", "administrative_area_level_2"]),
    city: firstComponent(place.addressComponents, ["locality", "postal_town", "administrative_area_level_3", "sublocality"]),
    postal_code: component(place.addressComponents, "postal_code"),
    street: component(place.addressComponents, "route"),
    street_number: component(place.addressComponents, "street_number"),
    phone_local: place.nationalPhoneNumber ?? null,
    phone_international: place.internationalPhoneNumber ?? null,
    website_url: websiteUrl,
    website_domain: normalizeDomain(websiteUrl),
    google_maps_url: normalizeUrl(place.googleMapsUri),
    rating: place.rating ?? null,
    rating_count: place.userRatingCount ?? null,
    latitude: place.location?.latitude ?? null,
    longitude: place.location?.longitude ?? null,
    source: "google",
    google_fetched_at: fetchedAt.toISOString(),
    google_cache_expires_at: expiresAt.toISOString(),
    field_sources: {
      display_name: fieldMeta,
      primary_category: fieldMeta,
      categories: fieldMeta,
      business_status: fieldMeta,
      formatted_address: fieldMeta,
      phone_local: fieldMeta,
      phone_international: fieldMeta,
      website_url: fieldMeta,
      google_maps_url: fieldMeta,
      rating: fieldMeta,
      rating_count: fieldMeta,
      location: fieldMeta
    }
  };
}

async function googleFetch<T>(ownerId: string, endpoint: string, billingCategory: string, url: string, init: RequestInit) {
  await reserveGoogleApiCall(ownerId, endpoint, billingCategory);
  const env = getServerEnv();
  const response = await fetch(url, {
    ...init,
    headers: {
      "content-type": "application/json",
      "x-goog-api-key": env.GOOGLE_MAPS_API_KEY,
      ...(init.headers ?? {})
    }
  });

  if (response.status === 429 || response.status >= 500) {
    throw new Error(`Átmeneti Google Places API hiba: HTTP ${response.status}`);
  }

  if (!response.ok) {
    const body = await response.text();
    throw new Error(`Google Places API hiba: HTTP ${response.status} ${body.slice(0, 300)}`);
  }

  return (await response.json()) as T;
}

export async function searchPlacesText(input: SearchTextInput) {
  const body: Record<string, unknown> = {
    textQuery: input.query,
    maxResultCount: Math.min(Math.max(input.maxResultCount ?? 20, 1), 20)
  };

  if (input.locationRestriction) {
    body.locationRestriction = input.locationRestriction;
  }

  const data = await googleFetch<{ places?: GooglePlace[] }>(
    input.ownerId,
    "places:searchText",
    "places_text_search_pro",
    TEXT_SEARCH_ENDPOINT,
    {
      method: "POST",
      headers: {
        "x-goog-fieldmask": PLACE_SEARCH_FIELD_MASK
      },
      body: JSON.stringify(body)
    }
  );

  return (data.places ?? []).map(normalizeGooglePlace).filter((place): place is NormalizedPlace => Boolean(place));
}

export async function fetchPlaceDetails(ownerId: string, placeId: string) {
  const encodedPlaceId = encodeURIComponent(placeId);
  const data = await googleFetch<GooglePlace>(
    ownerId,
    "places.get",
    "place_details_pro",
    `${DETAILS_ENDPOINT}/${encodedPlaceId}`,
    {
      method: "GET",
      headers: {
        "x-goog-fieldmask": PLACE_DETAILS_FIELD_MASK
      }
    }
  );

  return normalizeGooglePlace(data);
}

export async function resolveAreaViewport(input: ResolveAreaInput) {
  const areaQuery = [input.city, input.region, input.country].filter(Boolean).join(", ");
  const data = await googleFetch<{ places?: GooglePlace[] }>(
    input.ownerId,
    "places:searchText",
    "places_area_resolution",
    TEXT_SEARCH_ENDPOINT,
    {
      method: "POST",
      headers: {
        "x-goog-fieldmask": "places.id,places.displayName,places.formattedAddress,places.location,places.viewport,places.addressComponents"
      },
      body: JSON.stringify({
        textQuery: areaQuery,
        maxResultCount: 1
      })
    }
  );

  return data.places?.[0]?.viewport ?? null;
}

export function buildTextSearchQuery(category: string, country: string, region?: string | null, city?: string | null) {
  const normalizedCategory = normalizeComparableText(category);
  return [normalizedCategory === "minden" ? null : category, city, region, country].filter(Boolean).join(" ");
}

export function googlePlaceHasPhone(place: NormalizedPlace) {
  return Boolean(normalizePhone(place.phone_international) || normalizePhone(place.phone_local));
}
