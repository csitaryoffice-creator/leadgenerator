import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { addBusinessToTargets, createManualBusiness } from "@/lib/data/businesses";
import { normalizeEmail } from "@/lib/normalizers";
import { mapImportRow, readImportRows } from "@/lib/importer";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const form = await request.formData();
  const file = form.get("file");
  const mappingRaw = String(form.get("mapping") ?? "{}");
  const targetListId = String(form.get("targetListId") ?? "") || null;
  const targetFolderId = String(form.get("targetFolderId") ?? "") || null;

  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nem érkezett importfájl." }, { status: 422 });
  }

  const mapping = JSON.parse(mappingRaw) as Record<string, string>;
  const { rows } = await readImportRows(file);
  let importedRows = 0;
  let invalidRows = 0;
  let duplicateRows = 0;
  const errors: Array<{ row: number; message: string }> = [];

  for (const [index, row] of rows.entries()) {
    const parsed = mapImportRow(row, mapping);
    if (!parsed.success) {
      invalidRows += 1;
      errors.push({ row: index + 2, message: parsed.error.issues.map((issue) => issue.message).join(", ") });
      continue;
    }

    const websiteUrl = parsed.data.websiteUrl || null;
    const email = normalizeEmail(parsed.data.email);
    const phone = parsed.data.phone || null;

    let existingBusinessId: string | null = null;
    if (websiteUrl) {
      const { data } = await auth.supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", auth.user.id)
        .eq("website_url", websiteUrl)
        .is("deleted_at", null)
        .maybeSingle();
      existingBusinessId = data?.id ?? null;
    }

    if (!existingBusinessId && phone) {
      const { data } = await auth.supabase
        .from("businesses")
        .select("id")
        .eq("owner_id", auth.user.id)
        .eq("normalized_phone", phone)
        .is("deleted_at", null)
        .maybeSingle();
      existingBusinessId = data?.id ?? null;
    }

    if (!existingBusinessId && email) {
      const { data } = await auth.supabase
        .from("business_emails")
        .select("business_id")
        .eq("owner_id", auth.user.id)
        .eq("email", email)
        .maybeSingle();
      existingBusinessId = data?.business_id ?? null;
    }

    if (existingBusinessId) {
      duplicateRows += 1;
      await addBusinessToTargets(auth.supabase, auth.user.id, existingBusinessId, {
        listId: targetListId,
        folderId: targetFolderId
      });
      continue;
    }

    const business = await createManualBusiness(auth.supabase, auth.user.id, {
      displayName: parsed.data.displayName,
      primaryCategory: parsed.data.primaryCategory,
      country: parsed.data.country,
      region: parsed.data.region,
      city: parsed.data.city,
      formattedAddress: parsed.data.formattedAddress,
      phoneInternational: phone,
      websiteUrl,
      notes: parsed.data.notes
    });

    if (email) {
      await auth.supabase.from("business_emails").insert({
        owner_id: auth.user.id,
        business_id: business.id,
        email,
        source: "import",
        is_primary: true
      });
      await auth.supabase.from("businesses").update({ email_count: 1 }).eq("owner_id", auth.user.id).eq("id", business.id);
    }

    await addBusinessToTargets(auth.supabase, auth.user.id, business.id, {
      listId: targetListId,
      folderId: targetFolderId
    });
    importedRows += 1;
  }

  await auth.supabase.from("import_jobs").insert({
    owner_id: auth.user.id,
    filename: file.name,
    status: errors.length ? "failed" : "imported",
    total_rows: rows.length,
    valid_rows: importedRows,
    invalid_rows: invalidRows,
    duplicate_rows: duplicateRows,
    summary: { importedRows, invalidRows, duplicateRows, errors }
  });

  return NextResponse.json({ importedRows, invalidRows, duplicateRows, errors });
}
