import { describe, expect, it } from "vitest";
import { contactedTimestamp, leadProgress, leadStatuses } from "@/lib/lead-status";

describe("lead státusz és progress", () => {
  it("stabil státuszazonosítókat használ", () => {
    expect(leadStatuses).toEqual(["new", "contacted", "follow_up", "interested", "not_interested", "converted"]);
  });

  it("a feldolgozott nyers találatokból számol, és kész állapotban 100%", () => {
    expect(leadProgress("running", 5, 50)).toBe(10);
    expect(leadProgress("running", 100, 50)).toBe(99);
    expect(leadProgress("completed", 5, 50)).toBe(100);
  });

  it("megőrzi a contacted időbélyeget", () => {
    const timestamp = "2026-08-10T10:00:00.000Z";
    expect(contactedTimestamp("contacted", timestamp)).toBe(timestamp);
    expect(contactedTimestamp("new", timestamp)).toBe(timestamp);
  });
});
