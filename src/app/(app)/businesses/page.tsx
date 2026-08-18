import { Filter } from "lucide-react";
import { BusinessTable } from "@/components/business-table";
import { ManualBusinessForm } from "@/components/manual-business-form";
import { EmptyState } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";
import { listBusinesses } from "@/lib/data/businesses";
import { listFilterCollections } from "@/lib/data/collections";
import { businessQuerySchema } from "@/lib/validators";

export default async function BusinessesPage({
  searchParams
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { user, supabase } = await requirePageUser();
  const params = await searchParams;
  const query = businessQuerySchema.parse(params);
  const [result, collections] = await Promise.all([
    listBusinesses(supabase, user.id, query),
    listFilterCollections(supabase, user.id)
  ]);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Összes vállalkozás</h1>
        <p className="mt-1 text-sm text-ink/65">Központi, szűrhető és exportálható adatbázis.</p>
      </div>

      <form className="grid gap-3 rounded-md border border-line bg-white p-4 md:grid-cols-6">
        <label className="text-sm font-medium md:col-span-2">
          Globális keresés
          <input name="q" defaultValue={query.q} className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15" />
        </label>
        <label className="text-sm font-medium">
          Ország
          <input name="country" defaultValue={query.country} className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15" />
        </label>
        <label className="text-sm font-medium">
          Város
          <input name="city" defaultValue={query.city} className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15" />
        </label>
        <label className="text-sm font-medium">
          Státusz
          <select name="status" defaultValue={query.status} className="mt-1 w-full rounded-md border border-line px-3 py-2">
            <option value="">Mindegy</option>
            <option value="new">Új</option>
            <option value="contacted">Megkeresve</option>
            <option value="follow_up">Utánkövetés</option>
            <option value="interested">Érdeklődik</option>
            <option value="not_interested">Nem érdekli</option>
            <option value="converted">Konvertált</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          Mappa
          <select name="folderId" defaultValue={query.folderId ?? ""} className="mt-1 w-full rounded-md border border-line px-3 py-2">
            <option value="">Mindegy</option>
            {collections.folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">
          Lista
          <select name="listId" defaultValue={query.listId ?? ""} className="mt-1 w-full rounded-md border border-line px-3 py-2">
            <option value="">Mindegy</option>
            {collections.lists.map((list) => <option key={list.id} value={list.id}>{list.name}</option>)}
          </select>
        </label>
        <label className="text-sm font-medium">
          Weboldal
          <select name="website" defaultValue={query.website} className="mt-1 w-full rounded-md border border-line px-3 py-2">
            <option value="">Mindegy</option>
            <option value="yes">Van</option>
            <option value="no">Nincs</option>
          </select>
        </label>
        <label className="text-sm font-medium">
          E-mail
          <select name="email" defaultValue={query.email} className="mt-1 w-full rounded-md border border-line px-3 py-2">
            <option value="">Mindegy</option>
            <option value="yes">Van</option>
            <option value="no">Nincs</option>
          </select>
        </label>
        <button className="inline-flex items-center justify-center gap-2 rounded-md bg-forest px-3 py-2 text-sm font-semibold text-white md:col-span-6 md:w-fit">
          <Filter className="size-4" aria-hidden="true" />
          Szűrés
        </button>
      </form>

      <ManualBusinessForm />

      {result.rows.length ? (
        <BusinessTable rows={result.rows} total={result.total} page={query.page} pageSize={query.pageSize} />
      ) : (
        <EmptyState title="Nincs találat" body="A szűrés nem adott vissza vállalkozást." />
      )}
    </div>
  );
}
