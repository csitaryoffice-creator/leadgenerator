export type GoogleLatLng = {
  latitude: number;
  longitude: number;
};

export type GoogleViewport = {
  low: GoogleLatLng;
  high: GoogleLatLng;
};

export type GoogleAddressComponent = {
  longText?: string;
  shortText?: string;
  types?: string[];
  languageCode?: string;
};

export type GooglePlace = {
  id?: string;
  name?: string;
  displayName?: {
    text?: string;
    languageCode?: string;
  };
  primaryType?: string;
  types?: string[];
  businessStatus?: string;
  formattedAddress?: string;
  addressComponents?: GoogleAddressComponent[];
  nationalPhoneNumber?: string;
  internationalPhoneNumber?: string;
  websiteUri?: string;
  googleMapsUri?: string;
  rating?: number;
  userRatingCount?: number;
  location?: GoogleLatLng;
  viewport?: GoogleViewport;
};

export type NormalizedPlace = {
  google_place_id: string;
  google_resource_name: string | null;
  display_name: string;
  primary_category: string | null;
  categories: string[];
  business_status: string | null;
  formatted_address: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  postal_code: string | null;
  street: string | null;
  street_number: string | null;
  phone_local: string | null;
  phone_international: string | null;
  website_url: string | null;
  website_domain: string | null;
  google_maps_url: string | null;
  rating: number | null;
  rating_count: number | null;
  latitude: number | null;
  longitude: number | null;
  source: "google";
  google_fetched_at: string;
  google_cache_expires_at: string;
  field_sources: Record<string, { source: "google"; fetchedAt: string; expiresAt: string }>;
};
