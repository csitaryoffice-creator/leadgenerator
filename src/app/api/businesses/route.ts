import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { createManualBusiness, listBusinesses } from "@/lib/data/businesses";
import { businessInputSchema, businessQuerySchema } from "@/lib/validators";

function paramsToObject(url: string) {
  const object = Object.fromEntries(new URL(url).searchParams.entries());
  for (const key of ["folderId", "listId"]) {
    if (object[key] === "") delete object[key];
  }
  return object;
}

export async function GET(request: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const parsed = businessQuerySchema.safeParse(paramsToObject(request.url));
  if (!parsed.success) {
    return NextResponse.json({ error: "Hibás szűrési paraméter." }, { status: 422 });
  }

  const result = await listBusinesses(auth.supabase, auth.user.id, parsed.data);
  return NextResponse.json(result);
}

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const parsed = businessInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Hibás vállalkozási adat." }, { status: 422 });
  }

  const business = await createManualBusiness(auth.supabase, auth.user.id, parsed.data);
  return NextResponse.json({ business }, { status: 201 });
}
