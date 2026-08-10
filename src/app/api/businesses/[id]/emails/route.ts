import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { normalizeEmail } from "@/lib/normalizers";

export async function POST(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const body = await request.json();
  const email = normalizeEmail(body.email);
  if (!email) {
    return NextResponse.json({ error: "Hibás e-mail-cím." }, { status: 422 });
  }

  if (body.isPrimary) {
    await auth.supabase.from("business_emails").update({ is_primary: false }).eq("owner_id", auth.user.id).eq("business_id", id);
  }

  const { data, error } = await auth.supabase
    .from("business_emails")
    .upsert(
      {
        owner_id: auth.user.id,
        business_id: id,
        email,
        source_url: body.sourceUrl ?? null,
        source: "manual",
        is_primary: Boolean(body.isPrimary)
      },
      { onConflict: "business_id,normalized_email" }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: "Az e-mail-cím nem menthető." }, { status: 500 });
  }

  const { count } = await auth.supabase.from("business_emails").select("id", { count: "exact", head: true }).eq("owner_id", auth.user.id).eq("business_id", id);
  await auth.supabase.from("businesses").update({ email_count: count ?? 1 }).eq("owner_id", auth.user.id).eq("id", id);

  return NextResponse.json({ email: data });
}

export async function PUT(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { id } = await context.params;
  const body = await request.json();
  const emailId = typeof body.id === "string" ? body.id : "";
  const email = normalizeEmail(body.email);
  if (!emailId || !email) return NextResponse.json({ error: "Hibás e-mail-cím." }, { status: 422 });

  if (body.isPrimary) {
    await auth.supabase.from("business_emails").update({ is_primary: false }).eq("owner_id", auth.user.id).eq("business_id", id);
  }
  const { data, error } = await auth.supabase
    .from("business_emails")
    .update({ email, is_primary: Boolean(body.isPrimary), source: "manual" })
    .eq("id", emailId)
    .eq("owner_id", auth.user.id)
    .eq("business_id", id)
    .select()
    .maybeSingle();
  if (error) return NextResponse.json({ error: "Az e-mail-cím nem menthető." }, { status: 500 });
  if (!data) return NextResponse.json({ error: "Az e-mail-cím nem található." }, { status: 404 });
  return NextResponse.json({ email: data });
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;
  const { id } = await context.params;
  const emailId = new URL(request.url).searchParams.get("emailId");
  if (!emailId) return NextResponse.json({ error: "Hiányzó e-mail-azonosító." }, { status: 422 });
  const { error } = await auth.supabase.from("business_emails").delete().eq("id", emailId).eq("owner_id", auth.user.id).eq("business_id", id);
  if (error) return NextResponse.json({ error: "Az e-mail-cím nem törölhető." }, { status: 500 });
  const { count } = await auth.supabase.from("business_emails").select("id", { count: "exact", head: true }).eq("owner_id", auth.user.id).eq("business_id", id);
  await auth.supabase.from("businesses").update({ email_count: count ?? 0 }).eq("owner_id", auth.user.id).eq("id", id);
  return NextResponse.json({ ok: true });
}
