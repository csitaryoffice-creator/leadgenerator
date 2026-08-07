"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Plus } from "lucide-react";

export function ManualBusinessForm() {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/businesses", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          displayName: formData.get("displayName"),
          primaryCategory: formData.get("primaryCategory") || null,
          country: formData.get("country") || null,
          region: formData.get("region") || null,
          city: formData.get("city") || null,
          formattedAddress: formData.get("formattedAddress") || null,
          phoneInternational: formData.get("phoneInternational") || null,
          websiteUrl: formData.get("websiteUrl") || null,
          notes: formData.get("notes") || null
        })
      });

      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "A rekord nem menthető.");
        return;
      }

      setOpen(false);
      router.refresh();
    });
  }

  return (
    <div className="rounded-md border border-line bg-white p-4">
      <button onClick={() => setOpen((value) => !value)} className="inline-flex items-center gap-2 rounded-md bg-forest px-3 py-2 text-sm font-semibold text-white">
        <Plus className="size-4" aria-hidden="true" />
        Kézi rekord
      </button>

      {open ? (
        <form action={submit} className="mt-4 grid gap-3 md:grid-cols-2">
          {error ? <p className="md:col-span-2 rounded-md border border-clay/25 bg-clay/10 px-3 py-2 text-sm text-clay">{error}</p> : null}
          {[
            ["displayName", "Vállalkozás neve", true],
            ["primaryCategory", "Kategória", false],
            ["country", "Ország", false],
            ["region", "Régió/vármegye", false],
            ["city", "Város", false],
            ["phoneInternational", "Telefonszám", false],
            ["websiteUrl", "Weboldal", false]
          ].map(([name, label, required]) => (
            <label key={String(name)} className="text-sm font-medium">
              {label}
              <input name={String(name)} required={Boolean(required)} className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15" />
            </label>
          ))}
          <label className="text-sm font-medium md:col-span-2">
            Cím
            <input name="formattedAddress" className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15" />
          </label>
          <label className="text-sm font-medium md:col-span-2">
            Megjegyzés
            <textarea name="notes" rows={3} className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15" />
          </label>
          <button disabled={isPending} className="inline-flex items-center justify-center gap-2 rounded-md bg-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            <Plus className="size-4" aria-hidden="true" />
            {isPending ? "Mentés..." : "Mentés"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
