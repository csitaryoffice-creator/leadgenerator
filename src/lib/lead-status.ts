export const leadStatuses = ["new", "contacted", "follow_up", "interested", "not_interested", "converted"] as const;

export type LeadStatus = (typeof leadStatuses)[number];

export function leadProgress(status: string, rawRecords: number, desiredCount: number) {
  if (status === "completed") return 100;
  return Math.min(99, Math.round((rawRecords / Math.max(1, desiredCount)) * 100));
}

export function contactedTimestamp(status: LeadStatus, previous: string | null = null) {
  return status === "contacted" ? previous ?? new Date().toISOString() : previous;
}
