import { SearchForm } from "@/components/search-form";
import { requirePageUser } from "@/lib/auth";
import { listCollections } from "@/lib/data/collections";

export default async function NewSearchPage() {
  const { user, supabase } = await requirePageUser();
  const { folders, lists } = await listCollections(supabase, user.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Új keresés</h1>
        <p className="mt-1 text-sm text-ink/65">Google Places API alapú háttérkeresés.</p>
      </div>
      <SearchForm folders={folders as any} lists={lists as any} />
    </div>
  );
}
