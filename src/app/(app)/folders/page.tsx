import { CollectionsClient } from "@/components/collections-client";
import { requirePageUser } from "@/lib/auth";
import { listCollections } from "@/lib/data/collections";

export default async function FoldersPage() {
  const { user, supabase } = await requirePageUser();
  const collections = await listCollections(supabase, user.id);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Mappák és listák</h1>
        <p className="mt-1 text-sm text-ink/65">A rekordok hivatkozással kerülnek listákba és mappákba.</p>
      </div>
      <CollectionsClient folders={collections.folders as any} lists={collections.lists as any} savedViews={collections.savedViews as any} />
    </div>
  );
}
