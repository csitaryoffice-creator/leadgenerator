import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { previewImport } from "@/lib/importer";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const form = await request.formData();
  const file = form.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "Nem érkezett importfájl." }, { status: 422 });
  }

  const preview = await previewImport(file);
  await auth.supabase.from("import_jobs").insert({
    owner_id: auth.user.id,
    filename: preview.filename,
    total_rows: preview.validRows + preview.invalidRows,
    valid_rows: preview.validRows,
    invalid_rows: preview.invalidRows,
    summary: preview
  });

  return NextResponse.json({ preview });
}
