import type { SupabaseClient } from "@supabase/supabase-js";
import { crawlBusinessWebsite } from "@/lib/crawler";
import { addBusinessToTargets, findBusinessByPlaceId, setBusinessEmails } from "@/lib/data/businesses";
import { buildTextSearchQuery, fetchPlaceDetails, resolveAreaViewport, searchPlacesText } from "@/lib/google/places";
import type { GoogleViewport, NormalizedPlace } from "@/lib/google/types";
import { GoogleQuotaExceededError } from "@/lib/google/usage";
import { normalizeComparableText, normalizePhone } from "@/lib/normalizers";
import type { SearchJobInput } from "@/lib/validators";
import { log } from "@/lib/logger";

type PlanTaskParams = {
  type: "plan";
};

type SearchTaskParams = {
  type: "search";
  query: string;
  maxResultCount: number;
  locationRestriction?: {
    rectangle: GoogleViewport;
  };
};

type CrawlTaskParams = {
  type: "crawl";
  businessId: string;
  websiteUrl: string;
};

type RefreshGoogleTaskParams = {
  type: "refresh_google";
  businessId: string;
  placeId: string;
};

type SearchTaskRow = {
  id: string;
  owner_id: string;
  job_id: string;
  params: PlanTaskParams | SearchTaskParams | CrawlTaskParams | RefreshGoogleTaskParams;
  attempt_count: number;
};

type SearchJobRow = {
  id: string;
  owner_id: string;
  status: string;
  category: string;
  desired_count: number;
  country: string;
  region: string | null;
  city: string | null;
  website_condition: "any" | "with_website" | "without_google_website";
  target_folder_id: string | null;
  target_list_id: string | null;
  auto_email_crawl: boolean;
  saved_businesses_count: number;
};

export type WebsiteCondition = SearchJobRow["website_condition"];

export type SearchTaskDefinition = {
  owner_id: string;
  job_id: string;
  task_key: string;
  params: SearchTaskParams;
};

export function plannedSearchTaskCount(desiredCount: number) {
  return Math.max(1, Math.ceil(desiredCount / 20));
}

export async function createSearchJob(client: SupabaseClient, ownerId: string, input: SearchJobInput) {
  const { data: job, error } = await client
    .from("search_jobs")
    .insert({
      owner_id: ownerId,
      params: input,
      category: input.category,
      desired_count: input.desiredCount,
      country: input.country,
      region: input.region,
      city: input.city,
      website_condition: input.websiteCondition,
      target_folder_id: input.targetFolderId,
      target_list_id: input.targetListId,
      auto_email_crawl: input.autoEmailCrawl
    })
    .select()
    .single();

  if (error) {
    throw error;
  }

  const { error: taskError } = await client.from("search_tasks").insert({
    owner_id: ownerId,
    job_id: job.id,
    task_key: "plan",
    params: { type: "plan" } satisfies PlanTaskParams
  });

  if (taskError) {
    throw taskError;
  }

  return job;
}

export async function cancelSearchJob(client: SupabaseClient, ownerId: string, jobId: string) {
  const now = new Date().toISOString();
  const { error } = await client
    .from("search_jobs")
    .update({ status: "cancelled", finished_at: now })
    .eq("owner_id", ownerId)
    .eq("id", jobId)
    .in("status", ["queued", "running", "paused"]);

  if (error) {
    throw error;
  }

  const { error: taskError } = await client
    .from("search_tasks")
    .update({ status: "cancelled", finished_at: now })
    .eq("owner_id", ownerId)
    .eq("job_id", jobId)
    .in("status", ["queued", "running"]);

  if (taskError) {
    throw taskError;
  }
}

export function splitViewport(viewport: GoogleViewport | null, desiredCount: number) {
  const cells = plannedSearchTaskCount(desiredCount);

  if (!viewport || cells <= 1) {
    return [undefined];
  }

  const lngStep = (viewport.high.longitude - viewport.low.longitude) / cells;
  const result: Array<{ rectangle: GoogleViewport }> = [];

  for (let cell = 0; cell < cells; cell += 1) {
    result.push({
      rectangle: {
        low: {
          latitude: viewport.low.latitude,
          longitude: viewport.low.longitude + cell * lngStep
        },
        high: {
          latitude: viewport.high.latitude,
          longitude: viewport.low.longitude + (cell + 1) * lngStep
        }
      }
    });
  }

  return result;
}

export function buildSearchTaskDefinitions(
  job: Pick<SearchJobRow, "id" | "owner_id" | "category" | "desired_count" | "country" | "region" | "city">,
  viewport: GoogleViewport | null
): SearchTaskDefinition[] {
  const cells = splitViewport(viewport, job.desired_count);
  const query = buildTextSearchQuery(job.category, job.country, job.region, job.city);
  let remaining = job.desired_count;

  return cells
    .map((cell, index) => {
      const maxResultCount = Math.min(20, Math.max(0, remaining));
      remaining -= maxResultCount;

      return {
        owner_id: job.owner_id,
        job_id: job.id,
        task_key: `search:${index}`,
        params: {
          type: "search",
          query,
          maxResultCount,
          locationRestriction: cell
        } satisfies SearchTaskParams
      };
    })
    .filter((task) => task.params.maxResultCount > 0);
}

export function remainingNewLeadSlotsValue(desiredCount: number, savedBusinessesCount: number) {
  return Math.max(0, desiredCount - savedBusinessesCount);
}

export function canSaveNewLead(desiredCount: number, savedBeforeTask: number, savedInTask: number) {
  return savedBeforeTask + savedInTask < desiredCount;
}

export function geographyMatches(place: NormalizedPlace, job: Pick<SearchJobRow, "country" | "region" | "city">) {
  const normalizeGeography = (value: string | null | undefined, kind: "country") => {
    let normalized = normalizeComparableText(value);

    if (kind === "country") {
      normalized = normalized.replace(/\b(magyarorszag|hu)\b/g, "hungary");
    }
    return normalized;
  };

  const matches = (
    actual: string | null,
    expected: string | null | undefined,
    kind: "country",
    fallback?: string | null
  ) => {
    const normalizedExpected = normalizeGeography(expected, kind);
    if (!normalizedExpected) {
      return true;
    }

    const normalizedActual = normalizeGeography(actual, kind) || normalizeGeography(fallback, kind);
    if (!normalizedActual) {
      return false;
    }

    if (normalizedActual === normalizedExpected) {
      return true;
    }

    const actualTokens = new Set(normalizedActual.split(/[\s,.-]+/).filter(Boolean));
    return normalizedExpected.split(/[\s,.-]+/).filter(Boolean).every((token) => actualTokens.has(token));
  };

  return matches(place.country, job.country, "country", place.formatted_address);
}

export function websiteConditionMatches(place: NormalizedPlace, condition: WebsiteCondition) {
  if (condition === "with_website") {
    return Boolean(place.website_url);
  }

  if (condition === "without_google_website") {
    return !place.website_url;
  }

  return true;
}

async function getJob(client: SupabaseClient, jobId: string) {
  const { data, error } = await client.from("search_jobs").select("*").eq("id", jobId).single();
  if (error) throw error;
  return data as SearchJobRow;
}

async function getRemainingNewLeadSlots(client: SupabaseClient, jobId: string, fallbackDesiredCount: number) {
  const { data, error } = await client
    .from("search_jobs")
    .select("desired_count,saved_businesses_count")
    .eq("id", jobId)
    .single();

  if (error) throw error;

  return remainingNewLeadSlotsValue(data?.desired_count ?? fallbackDesiredCount, data?.saved_businesses_count ?? 0);
}

async function cancelQueuedSearchTasks(client: SupabaseClient, jobId: string) {
  const { error } = await client
    .from("search_tasks")
    .update({ status: "cancelled", finished_at: new Date().toISOString() })
    .eq("job_id", jobId)
    .eq("status", "queued");

  if (error) throw error;
}

async function incrementCounters(client: SupabaseClient, jobId: string, counters: Record<string, number>) {
  const { error } = await client.rpc("increment_search_job_counters", {
    p_job_id: jobId,
    p_processed_tasks: counters.processedTasks ?? 0,
    p_raw_records: counters.rawRecords ?? 0,
    p_excluded_records: counters.excludedRecords ?? 0,
    p_saved_businesses: counters.savedBusinesses ?? 0,
    p_duplicate_businesses: counters.duplicateBusinesses ?? 0,
    p_crawled_websites: counters.crawledWebsites ?? 0,
    p_found_emails: counters.foundEmails ?? 0
  });

  if (error) throw error;
}

async function finishTask(client: SupabaseClient, taskId: string, status: "completed" | "failed" | "cancelled", errorMessage?: string) {
  const { error } = await client
    .from("search_tasks")
    .update({
      status,
      finished_at: new Date().toISOString(),
      error_message: errorMessage ?? null
    })
    .eq("id", taskId);

  if (error) throw error;
}

async function retryTask(client: SupabaseClient, task: SearchTaskRow, error: unknown) {
  const delaySeconds = Math.min(300, 2 ** Math.max(task.attempt_count, 1) * 10);
  const nextRunAt = new Date(Date.now() + delaySeconds * 1000).toISOString();
  const message = error instanceof Error ? error.message : "Ismeretlen hiba.";

  if (task.attempt_count >= 4 || error instanceof GoogleQuotaExceededError) {
    await finishTask(client, task.id, "failed", message);
    await client.from("search_jobs").update({ status: "failed", error_message: message, finished_at: new Date().toISOString() }).eq("id", task.job_id);
    return;
  }

  const { error: updateError } = await client
    .from("search_tasks")
    .update({
      status: "queued",
      next_run_at: nextRunAt,
      error_message: message
    })
    .eq("id", task.id);

  if (updateError) throw updateError;
}

async function planSearch(client: SupabaseClient, task: SearchTaskRow, job: SearchJobRow) {
  const shouldSplit = job.desired_count > 20;
  let viewport: GoogleViewport | null = null;

  if (shouldSplit) {
    try {
      viewport = await resolveAreaViewport({
        ownerId: job.owner_id,
        country: job.country,
        region: job.region,
        city: job.city
      });
    } catch (error) {
      await client
        .from("search_jobs")
        .update({ error_message: "A terület nem bontható megbízhatóan; a worker a lehető legtöbb szabályos találatot kéri le." })
        .eq("id", job.id);
      log("warn", "Area resolution failed", { jobId: job.id, error });
    }
  }

  const tasks = buildSearchTaskDefinitions(job, viewport);

  const { error } = await client.from("search_tasks").upsert(tasks, { onConflict: "job_id,task_key" });
  if (error) throw error;

  await incrementCounters(client, job.id, { processedTasks: 1 });
  await finishTask(client, task.id, "completed");
}

function googleUpdateData(place: NormalizedPlace, manualOverrides: Record<string, unknown> = {}) {
  const data: Record<string, unknown> = {
    google_resource_name: place.google_resource_name,
    google_fetched_at: place.google_fetched_at,
    google_cache_expires_at: place.google_cache_expires_at,
    field_sources: place.field_sources
  };

  const fieldMap: Array<[keyof NormalizedPlace, string]> = [
    ["display_name", "display_name"],
    ["primary_category", "primary_category"],
    ["categories", "categories"],
    ["business_status", "business_status"],
    ["formatted_address", "formatted_address"],
    ["country", "country"],
    ["region", "region"],
    ["city", "city"],
    ["postal_code", "postal_code"],
    ["street", "street"],
    ["street_number", "street_number"],
    ["website_url", "website_url"],
    ["website_domain", "website_domain"],
    ["google_maps_url", "google_maps_url"],
    ["rating", "rating"],
    ["rating_count", "rating_count"],
    ["latitude", "latitude"],
    ["longitude", "longitude"]
  ];

  for (const [source, target] of fieldMap) {
    if (!manualOverrides[target]) {
      data[target] = place[source];
    }
  }

  if (!manualOverrides.phone) {
    data.phone_local = place.phone_local;
    data.phone_international = place.phone_international;
    data.normalized_phone = normalizePhone(place.phone_international) ?? normalizePhone(place.phone_local);
  }

  return data;
}

async function saveGooglePlace(client: SupabaseClient, job: SearchJobRow, place: NormalizedPlace) {
  const existingId = await findBusinessByPlaceId(client, job.owner_id, place.google_place_id);

  if (existingId) {
    const { data: existing, error: selectError } = await client
      .from("businesses")
      .select("manual_overrides")
      .eq("id", existingId)
      .single();
    if (selectError) throw selectError;

    const { error } = await client
      .from("businesses")
      .update(googleUpdateData(place, existing?.manual_overrides ?? {}))
      .eq("id", existingId);
    if (error) throw error;

    await addBusinessToTargets(client, job.owner_id, existingId, {
      listId: job.target_list_id,
      folderId: job.target_folder_id
    });

    return { businessId: existingId, duplicate: true };
  }

  const { data, error } = await client
    .from("businesses")
    .insert({
      owner_id: job.owner_id,
      ...place,
      normalized_phone: normalizePhone(place.phone_international) ?? normalizePhone(place.phone_local)
    })
    .select("id")
    .single();

  if (error) throw error;

  await addBusinessToTargets(client, job.owner_id, data.id, {
    listId: job.target_list_id,
    folderId: job.target_folder_id
  });

  return { businessId: data.id as string, duplicate: false };
}

async function crawlAndPersist(client: SupabaseClient, ownerId: string, businessId: string, websiteUrl: string) {
  await client
    .from("businesses")
    .update({ email_crawl_status: "running", email_crawl_error: null })
    .eq("owner_id", ownerId)
    .eq("id", businessId);

  const result = await crawlBusinessWebsite(websiteUrl);
  await setBusinessEmails(
    client,
    ownerId,
    businessId,
    result.emails.map((email, index) => ({
      email: email.email,
      sourceUrl: email.sourceUrl,
      source: "website",
      isPrimary: index === 0
    }))
  );

  const { error } = await client
    .from("businesses")
    .update({
      email_crawl_status: result.status,
      email_crawl_checked_at: new Date().toISOString(),
      email_crawl_error: result.errorMessage ?? null,
      contact_page_url: result.contactPageUrl,
      email_count: result.emails.length
    })
    .eq("owner_id", ownerId)
    .eq("id", businessId);

  if (error) throw error;

  return result;
}

async function processSearch(client: SupabaseClient, task: SearchTaskRow, job: SearchJobRow, params: SearchTaskParams) {
  const remainingAtStart = await getRemainingNewLeadSlots(client, job.id, job.desired_count);
  const savedBeforeTask = job.desired_count - remainingAtStart;

  if (remainingAtStart <= 0) {
    await cancelQueuedSearchTasks(client, job.id);
    await incrementCounters(client, job.id, { processedTasks: 1 });
    await finishTask(client, task.id, "completed");
    return;
  }

  const places = await searchPlacesText({
    ownerId: job.owner_id,
    query: params.query,
    maxResultCount: Math.min(params.maxResultCount, remainingAtStart),
    locationRestriction: params.locationRestriction
  });

  let excluded = 0;
  let excludedByGeography = 0;
  let excludedByWebsiteCondition = 0;
  let saved = 0;
  let duplicate = 0;
  let saveFailures = 0;
  let crawled = 0;
  let emails = 0;

  for (const place of places) {
    if (!canSaveNewLead(job.desired_count, savedBeforeTask, saved)) {
      break;
    }

    const geographyMatchesJob = geographyMatches(place, job);
    const websiteConditionMatchesJob = websiteConditionMatches(place, job.website_condition);

    if (!geographyMatchesJob || !websiteConditionMatchesJob) {
      excluded += 1;

      const exclusionReasons = [];
      if (!geographyMatchesJob) {
        excludedByGeography += 1;
        exclusionReasons.push("geography_mismatch");
      }
      if (!websiteConditionMatchesJob) {
        excludedByWebsiteCondition += 1;
        exclusionReasons.push("website_condition_mismatch");
      }

      log("info", "Google place excluded by search filters.", {
        businessName: place.display_name,
        formattedAddress: place.formatted_address,
        placeCountry: place.country,
        placeRegion: place.region,
        placeCity: place.city,
        jobCountry: job.country,
        jobRegion: job.region,
        jobCity: job.city,
        exclusionReasons
      });
      continue;
    }

    let result: { businessId: string; duplicate: boolean };
    try {
      result = await saveGooglePlace(client, job, place);
    } catch {
      saveFailures += 1;
      log("warn", "Google place could not be saved.", {
        businessName: place.display_name,
        formattedAddress: place.formatted_address,
        exclusionReason: "save_failure"
      });
      continue;
    }
    if (result.duplicate) {
      duplicate += 1;
    } else {
      saved += 1;
    }

    if (job.auto_email_crawl && place.website_url) {
      const crawl = await crawlAndPersist(client, job.owner_id, result.businessId, place.website_url);
      crawled += crawl.pagesChecked > 0 ? 1 : 0;
      emails += crawl.emails.length;
    }
  }

  if (remainingNewLeadSlotsValue(job.desired_count, savedBeforeTask + saved) <= 0) {
    await cancelQueuedSearchTasks(client, job.id);
  }

  if (excluded > 0 || duplicate > 0 || saveFailures > 0) {
    log("info", "Google place exclusion summary.", {
      exclusionCounts: {
        geography_mismatch: excludedByGeography,
        website_condition_mismatch: excludedByWebsiteCondition,
        duplicate,
        save_failure: saveFailures
      }
    });
  }

  await incrementCounters(client, job.id, {
    processedTasks: 1,
    rawRecords: places.length,
    excludedRecords: excluded,
    savedBusinesses: saved,
    duplicateBusinesses: duplicate,
    crawledWebsites: crawled,
    foundEmails: emails
  });
  await finishTask(client, task.id, "completed");
}

async function processCrawl(client: SupabaseClient, task: SearchTaskRow, params: CrawlTaskParams) {
  const result = await crawlAndPersist(client, task.owner_id, params.businessId, params.websiteUrl);
  await incrementCounters(client, task.job_id, {
    processedTasks: 1,
    crawledWebsites: result.pagesChecked > 0 ? 1 : 0,
    foundEmails: result.emails.length
  });
  await finishTask(client, task.id, "completed");
}

async function processRefreshGoogle(client: SupabaseClient, task: SearchTaskRow, params: RefreshGoogleTaskParams) {
  const place = await fetchPlaceDetails(task.owner_id, params.placeId);
  if (!place) {
    throw new Error("A Google Places rekord nem frissíthető.");
  }

  const { data: existing, error: selectError } = await client
    .from("businesses")
    .select("manual_overrides")
    .eq("owner_id", task.owner_id)
    .eq("id", params.businessId)
    .single();
  if (selectError) throw selectError;

  const { error } = await client
    .from("businesses")
    .update(googleUpdateData(place, existing?.manual_overrides ?? {}))
    .eq("owner_id", task.owner_id)
    .eq("id", params.businessId);
  if (error) throw error;

  await incrementCounters(client, task.job_id, { processedTasks: 1 });
  await finishTask(client, task.id, "completed");
}

export async function claimSearchTask(client: SupabaseClient) {
  const { data, error } = await client.rpc("claim_search_task");
  if (error) throw error;

  const task = Array.isArray(data) ? data[0] : data;

  if (!task?.id || !task?.job_id || !task?.owner_id) {
    return null;
  }

  return task as SearchTaskRow;
}

export async function processSearchTask(client: SupabaseClient, task: SearchTaskRow) {
  const job = await getJob(client, task.job_id);

  if (job.status === "cancelled") {
    await finishTask(client, task.id, "cancelled");
    return;
  }

  try {
    if (task.params.type === "plan") {
      await planSearch(client, task, job);
    } else if (task.params.type === "search") {
      await processSearch(client, task, job, task.params);
    } else if (task.params.type === "crawl") {
      await processCrawl(client, task, task.params);
    } else if (task.params.type === "refresh_google") {
      await processRefreshGoogle(client, task, task.params);
    }

    const { error } = await client.rpc("recount_job_completion", { p_job_id: task.job_id });
    if (error) throw error;
  } catch (error) {
    log("error", "Search task failed", { taskId: task.id, jobId: task.job_id, error });
    await retryTask(client, task, error);
  }
}

export async function queueEmailCrawl(client: SupabaseClient, ownerId: string, businessId: string, websiteUrl: string) {
  const { data: job, error } = await client
    .from("search_jobs")
    .insert({
      owner_id: ownerId,
      params: { type: "manual_email_crawl", businessId },
      category: "E-mail-keresés",
      desired_count: 1,
      country: "-",
      website_condition: "any",
      auto_email_crawl: false
    })
    .select()
    .single();

  if (error) throw error;

  const { error: taskError } = await client.from("search_tasks").insert({
    owner_id: ownerId,
    job_id: job.id,
    task_key: `crawl:${businessId}`,
    params: { type: "crawl", businessId, websiteUrl } satisfies CrawlTaskParams
  });

  if (taskError) throw taskError;
  return job;
}

export async function queueGoogleRefresh(client: SupabaseClient, ownerId: string, businessId: string, placeId: string) {
  const { data: job, error } = await client
    .from("search_jobs")
    .insert({
      owner_id: ownerId,
      params: { type: "refresh_google", businessId, placeId },
      category: "Google-frissítés",
      desired_count: 1,
      country: "-",
      website_condition: "any",
      auto_email_crawl: false
    })
    .select()
    .single();

  if (error) throw error;

  const { error: taskError } = await client.from("search_tasks").insert({
    owner_id: ownerId,
    job_id: job.id,
    task_key: `refresh-google:${businessId}`,
    params: { type: "refresh_google", businessId, placeId } satisfies RefreshGoogleTaskParams
  });

  if (taskError) throw taskError;
  return job;
}
