import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { getBusiness, restoreBusiness, softDeleteBusiness, updateBusiness } from "@/lib/data/businesses";
import { businessPatchSchema } from "@/lib/validators";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const business = await getBusiness(auth.supabase, auth.user.id, id);
  if (!business) {
    return NextResponse.json({ error: "A vállalkozás nem található." }, { status: 404 });
  }

  return NextResponse.json({ business });
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const parsed = businessPatchSchema.safeParse({ ...(await request.json()), id });
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.issues[0]?.message ?? "Hibás módosítás." }, { status: 422 });
  }

  const business = await updateBusiness(auth.supabase, auth.user.id, id, parsed.data);
  return NextResponse.json({ business });
}

export async function DELETE(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  await softDeleteBusiness(auth.supabase, auth.user.id, id);
  return NextResponse.json({ ok: true });
}

export async function PUT(_request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  await restoreBusiness(auth.supabase, auth.user.id, id);
  return NextResponse.json({ ok: true });
}
