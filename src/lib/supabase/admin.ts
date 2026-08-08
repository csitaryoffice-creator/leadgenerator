import { createClient } from "@supabase/supabase-js";
import { log } from "@/lib/logger";
import { getServerEnv } from "@/lib/env";

const nativeFetch = globalThis.fetch.bind(globalThis);

async function diagnosticFetch(input: RequestInfo | URL, init?: RequestInit) {
  const response = await nativeFetch(input, init);

  if (!response.ok) {
    const rawUrl =
      typeof input === "string"
        ? input
        : input instanceof URL
          ? input.href
          : input.url;

    const url = new URL(rawUrl);

    log("warn", "Supabase-kérés sikertelen.", {
      status: response.status,
      path: url.pathname
    });
  }

  return response;
}

export function createAdminClient() {
  const env = getServerEnv();

  return createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    },
    global: {
      fetch: diagnosticFetch
    }
  });
}
