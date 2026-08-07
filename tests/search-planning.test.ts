import { describe, expect, it } from "vitest";
import { buildSearchTaskDefinitions, canSaveNewLead, remainingNewLeadSlotsValue } from "@/lib/search/jobs";
import type { GoogleViewport } from "@/lib/google/types";

const viewport: GoogleViewport = {
  low: {
    latitude: 47,
    longitude: 18
  },
  high: {
    latitude: 48,
    longitude: 19
  }
};

describe("search task planning", () => {
  it("creates multiple search tasks for 50 requested results", () => {
    const tasks = buildSearchTaskDefinitions(
      {
        id: "job-1",
        owner_id: "owner-1",
        category: "konyvelo",
        desired_count: 50,
        country: "Magyarorszag",
        region: "Budapest",
        city: "Budapest"
      },
      viewport
    );

    expect(tasks).toHaveLength(3);
    expect(tasks.map((task) => task.params.maxResultCount)).toEqual([20, 20, 10]);
    expect(tasks.every((task) => task.params.locationRestriction)).toBe(true);
  });

  it("does not allow saved new leads to exceed desired_count", () => {
    let savedInTask = 0;

    for (let attempt = 0; attempt < 5; attempt += 1) {
      if (canSaveNewLead(3, 0, savedInTask)) {
        savedInTask += 1;
      }
    }

    expect(savedInTask).toBe(3);
    expect(remainingNewLeadSlotsValue(3, savedInTask)).toBe(0);
    expect(canSaveNewLead(3, 0, savedInTask)).toBe(false);
  });
});
