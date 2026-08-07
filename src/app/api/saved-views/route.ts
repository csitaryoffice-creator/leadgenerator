import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { createSavedView } from "@/lib/data/collections";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const body = await request.json();
  if (!body.name || String(body.name).trim().length < 1) {
    return NextResponse.json({ error: "A nézet neve kötelező." }, { status: 422 });
  }

  const view = await createSavedView(auth.supabase, auth.user.id, {
    name: String(body.name),
    filters: body.filters ?? {},
    sorting: body.sorting ?? [],
    columnState: body.columnState ?? {}
  });

  return NextResponse.json({ view }, { status: 201 });
}
