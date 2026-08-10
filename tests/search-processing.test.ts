import { beforeEach, describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { GooglePlace } from "@/lib/google/types";

const googleMocks = vi.hoisted(() => ({
  searchPlacesText: vi.fn()
}));
const businessMocks = vi.hoisted(() => ({
  addBusinessToTargets: vi.fn(),
  findBusinessByPlaceId: vi.fn()
}));
const loggerMocks = vi.hoisted(() => ({
  log: vi.fn()
}));

vi.mock("@/lib/google/places", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/lib/google/places")>();
  return {
    ...actual,
    searchPlacesText: googleMocks.searchPlacesText
  };
});

vi.mock("@/lib/data/businesses", () => businessMocks);
vi.mock("@/lib/logger", () => loggerMocks);

import { normalizeGooglePlace } from "@/lib/google/places";
import { processSearchTask } from "@/lib/search/jobs";

const ownerId = "00000000-0000-4000-8000-000000000001";
const jobId = "00000000-0000-4000-8000-000000000010";
const taskId = "00000000-0000-4000-8000-000000000011";

type MockClientOptions = {
  duplicatePlaceIds?: Set<string>;
  failingPlaceIds?: Set<string>;
};

function rawHairdresser(id: string, overrides: Partial<GooglePlace> = {}): GooglePlace {
  return {
    id,
    displayName: { text: `Hairdresser ${id}` },
    formattedAddress: "Székesfehérvár, Fejér County, Hungary",
    ...overrides
  };
}

function createMockClient(job: Record<string, unknown>, options: MockClientOptions = {}) {
  const insertedBusinesses: Array<Record<string, unknown>> = [];
  const rpcCalls: Array<{ name: string; args: Record<string, unknown> | undefined }> = [];

  const client = {
    from(table: string) {
      let selectedColumns = "";
      let inserted: Record<string, unknown> | null = null;
      let updatePayload: Record<string, unknown> | null = null;

      const builder = {
        select(columns?: string) {
          selectedColumns = columns ?? "";
          return builder;
        },
        insert(payload: Record<string, unknown>) {
          inserted = payload;
          return builder;
        },
        update(payload: Record<string, unknown>) {
          updatePayload = payload;
          return builder;
        },
        eq() {
          return builder;
        },
        async single() {
          if (table === "search_jobs") {
            if (selectedColumns.includes("saved_businesses_count")) {
              return { data: { desired_count: job.desired_count, saved_businesses_count: 0 }, error: null };
            }
            return { data: job, error: null };
          }

          if (table === "businesses" && inserted) {
            const placeId = inserted.google_place_id as string;
            if (options.failingPlaceIds?.has(placeId)) {
              return { data: null, error: new Error("mock save failure") };
            }
            insertedBusinesses.push(inserted);
            return { data: { id: `business-${placeId}` }, error: null };
          }

          if (table === "businesses" && selectedColumns === "manual_overrides") {
            return { data: { manual_overrides: {} }, error: null };
          }

          return { data: null, error: null };
        },
        then(resolve: (value: { data: null; error: null }) => unknown) {
          return Promise.resolve({ data: null, error: null }).then(resolve);
        }
      };

      void updatePayload;
      return builder;
    },
    async rpc(name: string, args?: Record<string, unknown>) {
      rpcCalls.push({ name, args });
      return { data: null, error: null };
    }
  };

  return { client: client as unknown as SupabaseClient, insertedBusinesses, rpcCalls };
}

function searchJob(overrides: Record<string, unknown> = {}) {
  return {
    id: jobId,
    owner_id: ownerId,
    status: "running",
    category: "Fodrász",
    desired_count: 5,
    country: "Magyarország",
    region: "Fejér vármegye",
    city: null,
    website_condition: "any",
    target_folder_id: null,
    target_list_id: null,
    auto_email_crawl: false,
    saved_businesses_count: 0,
    ...overrides
  };
}

function searchTask(query = "Fodrász Fejér vármegye Magyarország") {
  return {
    id: taskId,
    owner_id: ownerId,
    job_id: jobId,
    attempt_count: 0,
    params: { type: "search" as const, query, maxResultCount: 5 }
  };
}

describe("mocked search processing", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    businessMocks.findBusinessByPlaceId.mockResolvedValue(undefined);
    businessMocks.addBusinessToTargets.mockResolvedValue(undefined);
  });

  it("saves five valid raw hairdresser results with missing addressComponents", async () => {
    const rawPlaces = Array.from({ length: 5 }, (_, index) => rawHairdresser(`place-${index + 1}`));
    googleMocks.searchPlacesText.mockResolvedValue(rawPlaces.map(normalizeGooglePlace).filter(Boolean));
    const { client, insertedBusinesses, rpcCalls } = createMockClient(searchJob());

    await processSearchTask(client, searchTask());

    expect(insertedBusinesses).toHaveLength(5);
    expect(insertedBusinesses.map((place) => place.display_name)).toEqual(rawPlaces.map((place) => place.displayName?.text));
    expect(rpcCalls).toContainEqual({
      name: "increment_search_job_counters",
      args: expect.objectContaining({ p_raw_records: 5, p_excluded_records: 0, p_saved_businesses: 5 })
    });
    expect(loggerMocks.log).not.toHaveBeenCalledWith("info", "Google place excluded by search filters.", expect.anything());
  });

  it("reports geography, website, duplicate, and save failures separately", async () => {
    const geographyMismatch = rawHairdresser("place-geo", {
      formattedAddress: "Vienna, Austria",
      websiteUri: "https://geo.example"
    });
    const websiteMismatch = rawHairdresser("place-web", { websiteUri: undefined });
    const duplicate = rawHairdresser("place-duplicate", { websiteUri: "https://duplicate.example" });
    const saveFailure = rawHairdresser("place-failure", { websiteUri: "https://failure.example" });
    googleMocks.searchPlacesText.mockResolvedValue(
      [geographyMismatch, websiteMismatch, duplicate, saveFailure].map(normalizeGooglePlace).filter(Boolean)
    );
    businessMocks.findBusinessByPlaceId.mockImplementation(async (_client: unknown, _ownerId: string, placeId: string) =>
      placeId === "place-duplicate" ? "existing-business" : undefined
    );
    const { client } = createMockClient(searchJob({ website_condition: "with_website" }), {
      duplicatePlaceIds: new Set(["place-duplicate"]),
      failingPlaceIds: new Set(["place-failure"])
    });

    await processSearchTask(client, searchTask());

    expect(loggerMocks.log).toHaveBeenCalledWith(
      "info",
      "Google place exclusion summary.",
      {
        exclusionCounts: {
          geography_mismatch: 1,
          website_condition_mismatch: 1,
          duplicate: 1,
          save_failure: 1
        }
      }
    );
  });
});
