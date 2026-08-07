import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { cancelSearchJob } from "@/lib/search/jobs";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const admin = createAdminClient();
  await cancelSearchJob(admin, auth.user.id, id);
  return NextResponse.json({ ok: true });
}
