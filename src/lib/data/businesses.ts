import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeDomain, normalizePhone, normalizeUrl } from "@/lib/normalizers";
import type { BusinessQuery } from "@/lib/validators";

export type BusinessRow = {
  id: string;
  owner_id: string;
  google_place_id: string | null;
  display_name: string;
  primary_category: string | null;
  categories: string[];
  business_status: string | null;
  formatted_address: string | null;
  country: string | null;
  region: string | null;
  city: string | null;
  phone_local: string | null;
  phone_international: string | null;
  normalized_phone: string | null;
  website_url: string | null;
  website_domain: string | null;
  google_maps_url: string | null;
  rating: number | null;
  rating_count: number | null;
  source: string;
  email_count: number;
  email_crawl_status: string;
  email_crawl_checked_at: string | null;
  contact_page_url: string | null;
  google_fetched_at: string | null;
  google_cache_expires_at: string | null;
  field_sources: Record<string, unknown>;
  manual_overrides: Record<string, unknown>;
  notes: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
  business_emails?: Array<{
    id: string;
    email: string;
    is_primary: boolean;
    source_url: string | null;
  }>;
};

export type BusinessListResult = {
  rows: BusinessRow[];
  total: number;
};

const sortColumns = new Set([
  "display_name",
  "primary_category",
  "country",
  "region",
  "city",
  "rating",
  "rating_count",
  "business_status",
  "source",
  "created_at",
  "updated_at",
  "email_count"
]);

async function filterByMembership(
  client: SupabaseClient,
  table: "business_lists" | "business_folders",
  column: "list_id" | "folder_id",
  ownerId: string,
  value?: string | null
) {
  if (!value) {
    return null;
  }

  const { data, error } = await client.from(table).select("business_id").eq("owner_id", ownerId).eq(column, value);
  if (error) {
    throw error;
  }

  return (data ?? []).map((row: any) => row.business_id as string);
}

export async function listBusinesses(client: SupabaseClient, ownerId: string, query: BusinessQuery): Promise<BusinessListResult> {
  const page = query.page;
  const pageSize = query.pageSize;
  const from = (page - 1) * pageSize;
  const to = from + pageSize - 1;

  const [listIds, folderIds] = await Promise.all([
    filterByMembership(client, "business_lists", "list_id", ownerId, query.listId),
    filterByMembership(client, "business_folders", "folder_id", ownerId, query.folderId)
  ]);

  let request = client
    .from("businesses")
    .select(
      "*, business_emails(id,email,is_primary,source_url)",
      { count: "exact" }
    )
    .eq("owner_id", ownerId);

  if (query.deleted) {
    request = request.not("deleted_at", "is", null);
  } else {
    request = request.is("deleted_at", null);
  }

  if (query.q) {
    request = request.or(`display_name.ilike.%${query.q}%,formatted_address.ilike.%${query.q}%,website_url.ilike.%${query.q}%`);
  }
  if (query.country) {
    request = request.ilike("country", `%${query.country}%`);
  }
  if (query.region) {
    request = request.ilike("region", `%${query.region}%`);
  }
  if (query.city) {
    request = request.ilike("city", `%${query.city}%`);
  }
  if (query.website === "yes") {
    request = request.not("website_url", "is", null);
  }
  if (query.website === "no") {
    request = request.is("website_url", null);
  }
  if (query.email === "yes") {
    request = request.gt("email_count", 0);
  }
  if (query.email === "no") {
    request = request.eq("email_count", 0);
  }
  if (query.phone === "yes") {
    request = request.not("normalized_phone", "is", null);
  }
  if (query.phone === "no") {
    request = request.is("normalized_phone", null);
  }
  if (query.source) {
    request = request.eq("source", query.source);
  }
  if (listIds) {
    request = listIds.length === 0 ? request.eq("id", "00000000-0000-0000-0000-000000000000") : request.in("id", listIds);
  }
  if (folderIds) {
    request = folderIds.length === 0 ? request.eq("id", "00000000-0000-0000-0000-000000000000") : request.in("id", folderIds);
  }

  const sort = sortColumns.has(query.sort) ? query.sort : "display_name";
  request = request.order(sort, { ascending: query.dir === "asc" }).range(from, to);

  const { data, error, count } = await request;
  if (error) {
    throw error;
  }

  return {
    rows: (data ?? []) as BusinessRow[],
    total: count ?? 0
  };
}

export async function getBusiness(client: SupabaseClient, ownerId: string, id: string) {
  const { data, error } = await client
    .from("businesses")
    .select("*, business_emails(*), business_lists(list_id), business_folders(folder_id)")
    .eq("owner_id", ownerId)
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data as (BusinessRow & { business_lists: Array<{ list_id: string }>; business_folders: Array<{ folder_id: string }> }) | null;
}

export async function findBusinessByPlaceId(client: SupabaseClient, ownerId: string, placeId: string) {
  const { data, error } = await client
    .from("businesses")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("google_place_id", placeId)
    .maybeSingle();

  if (error) {
    throw error;
  }

  return data?.id as string | undefined;
}

export async function createManualBusiness(client: SupabaseClient, ownerId: string, input: Record<string, any>) {
  const websiteUrl = normalizeUrl(input.websiteUrl);
  const normalizedPhone = normalizePhone(input.phoneInternational) ?? normalizePhone(input.phoneLocal);

  const { data, error } = await client
    .from("businesses")
    .insert({
      owner_id: ownerId,
      display_name: input.displayName,
      primary_category: input.primaryCategory || null,
      country: input.country || null,
      region: input.region || null,
      city: input.city || null,
      formatted_address: input.formattedAddress || null,
      phone_local: input.phoneLocal || null,
      phone_international: input.phoneInternational || null,
      normalized_phone: normalizedPhone,
      website_url: websiteUrl,
      website_domain: normalizeDomain(websiteUrl),
      notes: input.notes || null,
      source: "manual",
      field_sources: {
        display_name: { source: "manual", updatedAt: new Date().toISOString() }
      },
      manual_overrides: {
        display_name: true,
        primary_category: Boolean(input.primaryCategory),
        formatted_address: Boolean(input.formattedAddress),
        phone: Boolean(normalizedPhone),
        website_url: Boolean(websiteUrl),
        notes: Boolean(input.notes)
      }
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as BusinessRow;
}

export async function updateBusiness(client: SupabaseClient, ownerId: string, id: string, patch: Record<string, any>) {
  const updates: Record<string, any> = {};
  const manualOverrides: Record<string, boolean> = {};

  if ("displayName" in patch) {
    updates.display_name = patch.displayName;
    manualOverrides.display_name = true;
  }
  if ("primaryCategory" in patch) {
    updates.primary_category = patch.primaryCategory || null;
    manualOverrides.primary_category = true;
  }
  if ("country" in patch) updates.country = patch.country || null;
  if ("region" in patch) updates.region = patch.region || null;
  if ("city" in patch) updates.city = patch.city || null;
  if ("formattedAddress" in patch) {
    updates.formatted_address = patch.formattedAddress || null;
    manualOverrides.formatted_address = true;
  }
  if ("phoneLocal" in patch) {
    updates.phone_local = patch.phoneLocal || null;
    manualOverrides.phone = true;
  }
  if ("phoneInternational" in patch) {
    updates.phone_international = patch.phoneInternational || null;
    manualOverrides.phone = true;
  }
  if ("phoneLocal" in patch || "phoneInternational" in patch) {
    updates.normalized_phone = normalizePhone(patch.phoneInternational) ?? normalizePhone(patch.phoneLocal);
  }
  if ("websiteUrl" in patch) {
    const websiteUrl = normalizeUrl(patch.websiteUrl);
    updates.website_url = websiteUrl;
    updates.website_domain = normalizeDomain(websiteUrl);
    manualOverrides.website_url = true;
  }
  if ("notes" in patch) {
    updates.notes = patch.notes || null;
    manualOverrides.notes = true;
  }

  if (Object.keys(manualOverrides).length > 0) {
    updates.manual_overrides = manualOverrides;
  }

  const { data, error } = await client
    .from("businesses")
    .update(updates)
    .eq("owner_id", ownerId)
    .eq("id", id)
    .select()
    .single();

  if (error) {
    throw error;
  }

  return data as BusinessRow;
}

export async function softDeleteBusiness(client: SupabaseClient, ownerId: string, id: string) {
  const { error } = await client
    .from("businesses")
    .update({ deleted_at: new Date().toISOString() })
    .eq("owner_id", ownerId)
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function restoreBusiness(client: SupabaseClient, ownerId: string, id: string) {
  const { error } = await client
    .from("businesses")
    .update({ deleted_at: null })
    .eq("owner_id", ownerId)
    .eq("id", id);

  if (error) {
    throw error;
  }
}

export async function setBusinessEmails(client: SupabaseClient, ownerId: string, businessId: string, emails: Array<{ email: string; sourceUrl?: string | null; source?: string; isPrimary?: boolean }>) {
  if (emails.length === 0) {
    return;
  }

  await client
    .from("business_emails")
    .update({ is_primary: false })
    .eq("owner_id", ownerId)
    .eq("business_id", businessId);

  const rows = emails.map((item, index) => ({
    owner_id: ownerId,
    business_id: businessId,
    email: item.email,
    source_url: item.sourceUrl ?? null,
    source: item.source ?? "website",
    is_primary: item.isPrimary ?? index === 0
  }));

  const { error } = await client.from("business_emails").upsert(rows, {
    onConflict: "business_id,normalized_email",
    ignoreDuplicates: false
  });

  if (error) {
    throw error;
  }

  const { count } = await client
    .from("business_emails")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .eq("business_id", businessId);

  await client.from("businesses").update({ email_count: count ?? rows.length }).eq("owner_id", ownerId).eq("id", businessId);
}

export async function addBusinessToTargets(
  client: SupabaseClient,
  ownerId: string,
  businessId: string,
  target: { listId?: string | null; folderId?: string | null }
) {
  if (target.listId) {
    const { error } = await client.from("business_lists").upsert({
      owner_id: ownerId,
      business_id: businessId,
      list_id: target.listId
    });
    if (error) throw error;
  }

  if (target.folderId) {
    const { error } = await client.from("business_folders").upsert({
      owner_id: ownerId,
      business_id: businessId,
      folder_id: target.folderId
    });
    if (error) throw error;
  }
}
