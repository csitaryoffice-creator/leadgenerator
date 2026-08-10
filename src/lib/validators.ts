import { z } from "zod";

export const websiteConditionSchema = z.enum(["any", "with_website", "without_google_website"]);
export const leadStatusSchema = z.enum(["new", "contacted", "follow_up", "interested", "not_interested", "converted"]);

export const searchJobInputSchema = z.object({
  category: z.string().trim().min(2, "Adj meg legalább két karakteres kategóriát vagy keresőkifejezést."),
  desiredCount: z.coerce.number().int().min(1).max(1000),
  country: z.string().trim().min(2, "Az ország kötelező."),
  region: z.string().trim().optional().nullable().transform((value) => value || null),
  city: z.string().trim().optional().nullable().transform((value) => value || null),
  websiteCondition: websiteConditionSchema.default("any"),
  targetFolderId: z.string().uuid().optional().nullable().transform((value) => value || null),
  targetListId: z.string().uuid().optional().nullable().transform((value) => value || null),
  autoEmailCrawl: z.coerce.boolean().default(true)
});

export const businessInputSchema = z.object({
  displayName: z.string().trim().min(1, "A vállalkozás neve kötelező."),
  primaryCategory: z.string().trim().optional().nullable(),
  country: z.string().trim().optional().nullable(),
  region: z.string().trim().optional().nullable(),
  city: z.string().trim().optional().nullable(),
  formattedAddress: z.string().trim().optional().nullable(),
  phoneLocal: z.string().trim().optional().nullable(),
  phoneInternational: z.string().trim().optional().nullable(),
  websiteUrl: z.string().trim().optional().nullable(),
  notes: z.string().trim().optional().nullable()
});

export const businessPatchSchema = businessInputSchema.partial().extend({
  id: z.string().uuid(),
  leadStatus: leadStatusSchema.optional()
});

export const businessQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(10).max(100).default(25),
  q: z.string().trim().optional().default(""),
  sort: z.string().trim().optional().default("display_name"),
  dir: z.enum(["asc", "desc"]).default("asc"),
  country: z.string().trim().optional().default(""),
  region: z.string().trim().optional().default(""),
  city: z.string().trim().optional().default(""),
  website: z.enum(["", "yes", "no"]).default(""),
  email: z.enum(["", "yes", "no"]).default(""),
  phone: z.enum(["", "yes", "no"]).default(""),
  source: z.string().trim().optional().default(""),
  status: z.string().trim().optional().default(""),
  folderId: z.string().uuid().optional().nullable(),
  listId: z.string().uuid().optional().nullable(),
  deleted: z.coerce.boolean().default(false)
});

export const exportInputSchema = z.object({
  format: z.enum(["csv", "xlsx"]),
  columns: z.array(z.string()).optional(),
  selectedIds: z.array(z.string().uuid()).optional(),
  filters: businessQuerySchema.partial().optional()
});

export type SearchJobInput = z.infer<typeof searchJobInputSchema>;
export type BusinessQuery = z.infer<typeof businessQuerySchema>;
