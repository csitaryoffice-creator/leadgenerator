import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { createSearchJob } from "@/lib/search/jobs";
import { estimateGoogleCalls } from "@/lib/google/usage";
import { createAdminClient } from "@/lib/supabase/admin";
import { searchJobInputSchema } from "@/lib/validators";

export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { data, error } = await auth.supabase
    .from("search_jobs")
    .select("*")
    .eq("owner_id", auth.user.id)
    .order("created_at", { ascending: false })
    .limit(50);

  if (error) {
    return NextResponse.json({ error: "A keresési előzmények nem tölthetők be." }, { status: 500 });
  }

  return NextResponse.json({ jobs: data ?? [] });
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const parsed = searchJobInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Hibás keresési adatok." }, { status: 422 });
  }

  const admin = createAdminClient();
  const job = await createSearchJob(admin, auth.user.id, parsed.data);
  return NextResponse.json({
    job,
    estimate: estimateGoogleCalls(parsed.data.desiredCount, parsed.data.desiredCount > 20)
  });
}
