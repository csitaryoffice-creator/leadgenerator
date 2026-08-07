import { getServerEnv } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export class GoogleQuotaExceededError extends Error {
  constructor() {
    super("Elérted a beállított havi Google Places API-korlátot.");
    this.name = "GoogleQuotaExceededError";
  }
}

export async function reserveGoogleApiCall(ownerId: string, endpoint: string, billingCategory: string, units = 1) {
  const admin = createAdminClient();
  const env = getServerEnv();
  const { data, error } = await admin.rpc("reserve_google_api_usage", {
    p_owner_id: ownerId,
    p_endpoint: endpoint,
    p_billing_category: billingCategory,
    p_monthly_limit: env.GOOGLE_MONTHLY_REQUEST_LIMIT,
    p_units: units
  });

  if (error) {
    throw error;
  }

  if (!data) {
    throw new GoogleQuotaExceededError();
  }
}

export function estimateGoogleCalls(desiredCount: number, shouldResolveArea: boolean) {
  const searchCalls = Math.max(1, Math.ceil(desiredCount / 20));
  return {
    minimum: searchCalls + (shouldResolveArea ? 1 : 0),
    conservative: Math.ceil(searchCalls * 1.25) + (shouldResolveArea ? 1 : 0)
  };
}
