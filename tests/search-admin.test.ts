import type { SupabaseClient } from "@supabase/supabase-js";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { createSearchJob } from "@/lib/search/jobs";
import { searchJobInputSchema } from "@/lib/validators";

const verifiedOwnerId = "00000000-0000-4000-8000-000000000001";
const attackerOwnerId = "00000000-0000-4000-8000-000000000002";

const inputPayload = {
  category: "fogorvos",
  desiredCount: 50,
  country: "Magyarorszag",
  region: "Budapest",
  city: "Budapest",
  websiteCondition: "any",
  targetFolderId: null,
  targetListId: null,
  autoEmailCrawl: true
};

class RecordingSupabaseClient {
  readonly inserts: Record<string, Array<Record<string, unknown>>> = {
    search_jobs: [],
    search_tasks: []
  };

  from(table: string) {
    return {
      insert: (payload: Record<string, unknown> | Array<Record<string, unknown>>) => {
        const rows = Array.isArray(payload) ? payload : [payload];
        this.inserts[table] ??= [];
        this.inserts[table].push(...rows);

        if (table === "search_jobs") {
          const job = {
            id: "job-1",
            status: "queued",
            saved_businesses_count: 0,
            ...rows[0]
          };

          return {
            select: () => ({
              single: async () => ({ data: job, error: null })
            })
          };
        }

        return { error: null };
      }
    };
  }
}

describe("search job server ownership", () => {
  it("lets an authorized server user create a search job and task", async () => {
    const parsed = searchJobInputSchema.parse(inputPayload);
    const client = new RecordingSupabaseClient();

    await createSearchJob(client as unknown as SupabaseClient, verifiedOwnerId, parsed);

    expect(client.inserts.search_jobs).toHaveLength(1);
    expect(client.inserts.search_tasks).toHaveLength(1);
    expect(client.inserts.search_jobs[0]?.owner_id).toBe(verifiedOwnerId);
    expect(client.inserts.search_tasks[0]?.owner_id).toBe(verifiedOwnerId);
  });

  it("does not let client payload choose another owner_id for a task", async () => {
    const parsed = searchJobInputSchema.parse({
      ...inputPayload,
      owner_id: attackerOwnerId
    });
    const client = new RecordingSupabaseClient();

    await createSearchJob(client as unknown as SupabaseClient, verifiedOwnerId, parsed);

    expect(client.inserts.search_jobs[0]?.owner_id).toBe(verifiedOwnerId);
    expect(client.inserts.search_tasks[0]?.owner_id).toBe(verifiedOwnerId);
    expect(client.inserts.search_tasks[0]?.owner_id).not.toBe(attackerOwnerId);
  });

  it("keeps browser RLS from inserting or updating search tasks", () => {
    const migration = readFileSync(join(process.cwd(), "supabase", "migrations", "202608060001_initial_schema.sql"), "utf8");

    expect(migration).toContain("create policy search_tasks_owner_select");
    expect(migration).not.toMatch(/create policy\s+\w+\s+on public\.search_tasks\s+for\s+(insert|update|all)\s+to authenticated/i);
  });
});
