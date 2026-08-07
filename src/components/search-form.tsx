"use client";

import { useMemo, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Play, Save } from "lucide-react";
import { estimateGoogleCalls } from "@/lib/google/usage";

export function SearchForm({
  folders,
  lists
}: {
  folders: Array<{ id: string; name: string }>;
  lists: Array<{ id: string; name: string }>;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [desiredCount, setDesiredCount] = useState(40);
  const [isPending, startTransition] = useTransition();

  const estimate = useMemo(() => estimateGoogleCalls(desiredCount, desiredCount > 60), [desiredCount]);

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/search-jobs", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          category: formData.get("category"),
          desiredCount: Number(formData.get("desiredCount")),
          country: formData.get("country"),
          region: formData.get("region") || null,
          city: formData.get("city") || null,
          websiteCondition: formData.get("websiteCondition"),
          targetFolderId: formData.get("targetFolderId") || null,
          targetListId: formData.get("targetListId") || null,
          autoEmailCrawl: formData.get("autoEmailCrawl") === "on"
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "A keresés nem indítható.");
        return;
      }

      router.push("/search-history");
      router.refresh();
    });
  }

  return (
    <form action={submit} className="grid gap-4 rounded-md border border-line bg-white p-5 md:grid-cols-2">
      {error ? <p className="md:col-span-2 rounded-md border border-clay/25 bg-clay/10 px-3 py-2 text-sm text-clay">{error}</p> : null}

      <label className="text-sm font-medium">
        Kategória vagy keresőkifejezés
        <input name="category" required className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15" />
      </label>

      <label className="text-sm font-medium">
        Kívánt találatszám
        <input
          name="desiredCount"
          type="number"
          min={1}
          max={1000}
          value={desiredCount}
          onChange={(event) => setDesiredCount(Number(event.target.value))}
          className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15"
        />
      </label>

      <label className="text-sm font-medium">
        Ország
        <input name="country" required className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15" />
      </label>

      <label className="text-sm font-medium">
        Régió, vármegye vagy tartomány
        <input name="region" className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15" />
      </label>

      <label className="text-sm font-medium">
        Város vagy település
        <input name="city" className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15" />
      </label>

      <label className="text-sm font-medium">
        Weboldal szerinti feltétel
        <select name="websiteCondition" className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15">
          <option value="any">Mindegy</option>
          <option value="with_website">Csak weboldallal</option>
          <option value="without_google_website">Csak Google Mapsen megadott weboldal nélkül</option>
        </select>
      </label>

      <label className="text-sm font-medium">
        Célmappa
        <select name="targetFolderId" className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15">
          <option value="">Nincs</option>
          {folders.map((folder) => (
            <option key={folder.id} value={folder.id}>
              {folder.name}
            </option>
          ))}
        </select>
      </label>

      <label className="text-sm font-medium">
        Céllista
        <select name="targetListId" className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15">
          <option value="">Nincs</option>
          {lists.map((list) => (
            <option key={list.id} value={list.id}>
              {list.name}
            </option>
          ))}
        </select>
      </label>

      <label className="flex items-center gap-3 rounded-md border border-line px-3 py-2 text-sm font-medium md:col-span-2">
        <input name="autoEmailCrawl" type="checkbox" defaultChecked className="size-4 accent-forest" />
        E-mail-keresés automatikus futtatása a talált weboldalakon
      </label>

      <div className="flex flex-col gap-3 rounded-md border border-line bg-mist p-3 text-sm md:col-span-2 md:flex-row md:items-center md:justify-between">
        <span>
          Konzervatív Google API-becslés: <strong>{estimate.conservative}</strong> hívás. A kívánt darabszám célérték, nem garantált eredmény.
        </span>
        <button disabled={isPending} className="inline-flex items-center justify-center gap-2 rounded-md bg-forest px-4 py-2 font-semibold text-white hover:bg-forest/90 disabled:opacity-60">
          <Play className="size-4" aria-hidden="true" />
          {isPending ? "Indítás..." : "Keresés indítása"}
        </button>
      </div>

      <button type="button" className="hidden">
        <Save className="size-4" aria-hidden="true" />
      </button>
    </form>
  );
}
