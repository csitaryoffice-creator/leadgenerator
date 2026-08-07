import { z } from "zod";

const serverEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  GOOGLE_MAPS_API_KEY: z.string().min(1),
  ALLOWED_USER_EMAIL: z.string().email(),
  GOOGLE_MONTHLY_REQUEST_LIMIT: z.coerce.number().int().positive().default(900),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000"),
  APP_PUBLIC_BASE_URL: z.string().url().default("http://localhost:3000"),
  LOG_LEVEL: z.enum(["debug", "info", "warn", "error"]).default("info"),
  CRAWLER_TIMEOUT_MS: z.coerce.number().int().positive().default(7000),
  CRAWLER_MAX_PAGES_PER_BUSINESS: z.coerce.number().int().positive().max(10).default(10),
  CRAWLER_MAX_RESPONSE_BYTES: z.coerce.number().int().positive().default(1_048_576),
  CRAWLER_CONCURRENCY: z.coerce.number().int().positive().max(4).default(2),
  CRAWLER_USER_AGENT: z.string().min(10).default("LeadgyujtoBot/1.0")
});

const publicEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3000")
});

export type ServerEnv = z.infer<typeof serverEnvSchema>;
export type PublicEnv = z.infer<typeof publicEnvSchema>;

function formatEnvError(error: z.ZodError) {
  return error.issues.map((issue) => `${issue.path.join(".")}: ${issue.message}`).join("; ");
}

export function getServerEnv(): ServerEnv {
  const parsed = serverEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Hiányzó vagy hibás szerver környezeti változó: ${formatEnvError(parsed.error)}`);
  }
  return parsed.data;
}

export function getPublicEnv(): PublicEnv {
  const parsed = publicEnvSchema.safeParse(process.env);
  if (!parsed.success) {
    throw new Error(`Hiányzó vagy hibás publikus környezeti változó: ${formatEnvError(parsed.error)}`);
  }
  return parsed.data;
}

export function getOptionalServerEnv() {
  return serverEnvSchema.partial().parse(process.env);
}
