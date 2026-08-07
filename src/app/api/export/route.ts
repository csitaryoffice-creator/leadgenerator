import { NextResponse } from "next/server";
import { requireApiUser } from "@/lib/auth";
import { listBusinesses } from "@/lib/data/businesses";
import { buildCsv, buildXlsx, selectExportColumns } from "@/lib/export";
import { businessQuerySchema, exportInputSchema } from "@/lib/validators";

export async function POST(request: Request) {
  const auth = await requireApiUser();
  if ("error" in auth) return auth.error;

  const parsed = exportInputSchema.safeParse(await request.json());
  if (!parsed.success) {
    return NextResponse.json({ error: "Hibás export kérés." }, { status: 422 });
  }

  const columns = selectExportColumns(parsed.data.columns);
  const filters = businessQuerySchema.parse({
    ...(parsed.data.filters ?? {}),
    page: 1,
    pageSize: 100
  });

  let rows = [];
  if (parsed.data.selectedIds?.length) {
    const { data, error } = await auth.supabase
      .from("businesses")
      .select("*, business_emails(id,email,is_primary,source_url)")
      .eq("owner_id", auth.user.id)
      .in("id", parsed.data.selectedIds);
    if (error) throw error;
    rows = data ?? [];
  } else {
    const first = await listBusinesses(auth.supabase, auth.user.id, filters);
    rows = [...first.rows];
    const pages = Math.ceil(first.total / filters.pageSize);
    for (let page = 2; page <= pages; page += 1) {
      const next = await listBusinesses(auth.supabase, auth.user.id, { ...filters, page });
      rows.push(...next.rows);
    }
  }

  if (parsed.data.format === "csv") {
    return new Response(buildCsv(rows, columns), {
      headers: {
        "content-type": "text/csv; charset=utf-8",
        "content-disposition": 'attachment; filename="leadgyujto-export.csv"'
      }
    });
  }

  return new Response(await buildXlsx(rows, columns), {
    headers: {
      "content-type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "content-disposition": 'attachment; filename="leadgyujto-export.xlsx"'
    }
  });
}
