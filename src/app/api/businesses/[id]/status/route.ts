import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";
import { leadStatusSchema } from "@/lib/validators";

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const { id } = await context.params;
  const parsed = leadStatusSchema.safeParse((await request.json()).leadStatus);
  if (!parsed.success) {
    return NextResponse.json({ error: "Érvénytelen lead státusz." }, { status: 422 });
  }

  const admin = createAdminClient();
  const { data: ownedBusiness, error: ownershipError } = await admin
    .from("businesses")
    .select("id")
    .eq("id", id)
    .eq("owner_id", auth.user.id)
    .maybeSingle();
  if (ownershipError) return NextResponse.json({ error: "A vállalkozás nem ellenőrizhető." }, { status: 500 });
  if (!ownedBusiness) return NextResponse.json({ error: "A vállalkozás nem található." }, { status: 404 });

  const now = new Date().toISOString();
  const updates: Record<string, string> = {
    lead_status: parsed.data,
    status_updated_at: now
  };
  if (parsed.data === "contacted") updates.contacted_at = now;

  const { data, error } = await admin
    .from("businesses")
    .update(updates)
    .eq("id", id)
    .eq("owner_id", auth.user.id)
    .select("id,lead_status,status_updated_at,contacted_at")
    .single();
  if (error) return NextResponse.json({ error: "A státusz mentése nem sikerült." }, { status: 500 });

  return NextResponse.json({ business: data });
}
