import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getBusiness } from "@/lib/data/businesses";
import { queueGoogleRefresh } from "@/lib/search/jobs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const business = await getBusiness(auth.supabase, auth.user.id, id);
  if (!business?.google_place_id) {
    return NextResponse.json({ error: "Ez a rekord nem rendelkezik Google Place ID-val." }, { status: 422 });
  }

  const job = await queueGoogleRefresh(auth.supabase, auth.user.id, id, business.google_place_id);
  return NextResponse.json({ job });
}
