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
