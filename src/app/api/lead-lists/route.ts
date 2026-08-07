import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { createLeadList } from "@/lib/data/collections";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  if (!body.name || String(body.name).trim().length < 1) {
    return NextResponse.json({ error: "A lista neve kötelező." }, { status: 422 });
  }

  const list = await createLeadList(auth.supabase, auth.user.id, String(body.name), body.folderId ?? null);
  return NextResponse.json({ list }, { status: 201 });
}
