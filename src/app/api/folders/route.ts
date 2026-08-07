import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { createFolder, listCollections } from "@/lib/data/collections";

export async function GET() {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  return NextResponse.json(await listCollections(auth.supabase, auth.user.id));
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  if (!body.name || String(body.name).trim().length < 1) {
    return NextResponse.json({ error: "A mappa neve kötelező." }, { status: 422 });
  }

  const folder = await createFolder(auth.supabase, auth.user.id, String(body.name), body.parentId ?? null);
  return NextResponse.json({ folder }, { status: 201 });
}
