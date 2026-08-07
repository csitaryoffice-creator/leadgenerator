import { SearchJobsClient } from "@/components/search-jobs-client";
import { Badge, EmptyState } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";

export default async function SearchHistoryPage() {
  const { user, supabase } = await requirePageUser();
  const { data, error } = await supabase.from("search_jobs").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(100);

  if (error) {
    throw error;
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Keresési előzmények</h1>
        <p className="mt-1 text-sm text-ink/65">Tartós háttérfeladatok technikai állapota.</p>
      </div>

      {data?.length ? <SearchJobsClient jobs={data as any} /> : <EmptyState title="Nincs keresési feladat" body="Az indított keresések itt követhetők és szakíthatók meg." />}
      <div className="sr-only">
        <Badge>queued</Badge>
      </div>
    </div>
  );
}
