import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getBusiness } from "@/lib/data/businesses";
import { queueEmailCrawl } from "@/lib/search/jobs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const business = await getBusiness(auth.supabase, auth.user.id, id);
  if (!business?.website_url) {
    return NextResponse.json({ error: "Ehhez a vállalkozáshoz nincs weboldal." }, { status: 422 });
  }

  const job = await queueEmailCrawl(auth.supabase, auth.user.id, id, business.website_url);
  return NextResponse.json({ job });
}
