import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { cancelSearchJob } from "@/lib/search/jobs";

export async function POST(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  await cancelSearchJob(auth.supabase, auth.user.id, id);
  return NextResponse.json({ ok: true });
}
