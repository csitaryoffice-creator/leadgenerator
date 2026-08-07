import { EmptyState } from "@/components/ui";
import { TrashClient } from "@/components/trash-client";
import { requirePageUser } from "@/lib/auth";
import { listBusinesses } from "@/lib/data/businesses";
import { businessQuerySchema } from "@/lib/validators";

export default async function TrashPage() {
  const { user, supabase } = await requirePageUser();
  const query = businessQuerySchema.parse({ deleted: true, pageSize: 100 });
  const result = await listBusinesses(supabase, user.id, query);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Lomtár</h1>
        <p className="mt-1 text-sm text-ink/65">Soft delete rekordok visszaállítása.</p>
      </div>
      {result.rows.length ? <TrashClient rows={result.rows} /> : <EmptyState title="A lomtár üres" body="Nincs visszaállítható rekord." />}
    </div>
  );
}
