"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useTransition } from "react";
import { FolderPlus, ListPlus, Save } from "lucide-react";

export function CollectionsClient({
  folders,
  lists,
  savedViews
}: {
  folders: Array<{ id: string; name: string; parent_id: string | null }>;
  lists: Array<{ id: string; name: string; folder_id: string | null }>;
  savedViews: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  function submit(path: string, formData: FormData) {
    startTransition(async () => {
      const response = await fetch(path, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          name: formData.get("name"),
          parentId: formData.get("parentId") || null,
          folderId: formData.get("folderId") || null
        })
      });
      if (response.ok) router.refresh();
    });
  }

  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <section className="rounded-md border border-line bg-white p-5">
        <h2 className="font-semibold">Mappak</h2>
        <form action={(formData) => submit("/api/folders", formData)} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input name="name" placeholder="Mappa neve" required className="min-w-0 flex-1 rounded-md border border-line px-3 py-2" />
          <select name="parentId" className="rounded-md border border-line px-3 py-2">
            <option value="">Felso szint</option>
            {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
          </select>
          <button disabled={isPending} className="inline-flex items-center justify-center gap-2 rounded-md bg-forest px-3 py-2 text-sm font-semibold text-white">
            <FolderPlus className="size-4" aria-hidden="true" />
            Letrehozas
          </button>
        </form>
        <div className="mt-4 divide-y divide-line">
          {folders.map((folder) => (
            <Link key={folder.id} href={`/businesses?folderId=${folder.id}`} className="block py-3 text-sm hover:bg-mist/60">
              <p className="font-medium text-forest">{folder.name}</p>
              <p className="text-ink/55">{folder.parent_id ? "Almappa" : "Felso szint"}</p>
              <p className="mt-1 text-xs text-ink/50">Vallalkozasok megnyitasa</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-5">
        <h2 className="font-semibold">Listak</h2>
        <form action={(formData) => submit("/api/lead-lists", formData)} className="mt-4 flex flex-col gap-3 sm:flex-row">
          <input name="name" placeholder="Lista neve" required className="min-w-0 flex-1 rounded-md border border-line px-3 py-2" />
          <select name="folderId" className="rounded-md border border-line px-3 py-2">
            <option value="">Nincs mappa</option>
            {folders.map((folder) => <option key={folder.id} value={folder.id}>{folder.name}</option>)}
          </select>
          <button disabled={isPending} className="inline-flex items-center justify-center gap-2 rounded-md bg-forest px-3 py-2 text-sm font-semibold text-white">
            <ListPlus className="size-4" aria-hidden="true" />
            Letrehozas
          </button>
        </form>
        <div className="mt-4 divide-y divide-line">
          {lists.map((list) => (
            <Link key={list.id} href={`/businesses?listId=${list.id}`} className="block py-3 text-sm hover:bg-mist/60">
              <p className="font-medium text-forest">{list.name}</p>
              <p className="text-ink/55">{list.folder_id ? "Mappaban" : "Mappa nelkul"}</p>
              <p className="mt-1 text-xs text-ink/50">Vallalkozasok megnyitasa</p>
            </Link>
          ))}
        </div>
      </section>

      <section className="rounded-md border border-line bg-white p-5 lg:col-span-2">
        <h2 className="font-semibold">Mentett nezetek</h2>
        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {savedViews.map((view) => (
            <div key={view.id} className="rounded-md border border-line px-3 py-3 text-sm">
              <Save className="mb-2 size-4 text-forest" aria-hidden="true" />
              <p className="font-medium">{view.name}</p>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
