"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ExternalLink, MailSearch, Map, RefreshCcw, Save, Trash2 } from "lucide-react";
import type { BusinessRow } from "@/lib/data/businesses";
import { Badge } from "@/components/ui";

export function BusinessDetail({ business }: { business: BusinessRow & { business_lists?: Array<{ list_id: string }>; business_folders?: Array<{ folder_id: string }> } }) {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [emailDraft, setEmailDraft] = useState("");
  const [editingEmailId, setEditingEmailId] = useState<string | null>(null);

  function submit(formData: FormData) {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(`/api/businesses/${business.id}`, {
        method: "PATCH",
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
          notes: formData.get("notes") || null,
          leadStatus: formData.get("leadStatus")
        })
      });
      const payload = await response.json();
      setMessage(response.ok ? "Mentve." : payload.error ?? "A módosítás nem sikerült.");
      router.refresh();
    });
  }

  function runAction(path: string, okMessage: string) {
    setMessage(null);
    startTransition(async () => {
      const response = await fetch(path, { method: "POST" });
      const payload = await response.json().catch(() => ({}));
      setMessage(response.ok ? okMessage : payload.error ?? "A művelet nem sikerült.");
      router.refresh();
    });
  }

  async function moveToTrash() {
    await fetch(`/api/businesses/${business.id}`, { method: "DELETE" });
    router.push("/businesses");
    router.refresh();
  }

  async function saveEmail() {
    const response = await fetch(`/api/businesses/${business.id}/emails`, {
      method: editingEmailId ? "PUT" : "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ id: editingEmailId, email: emailDraft, isPrimary: false })
    });
    const payload = await response.json().catch(() => ({}));
    setMessage(response.ok ? "E-mail mentve." : payload.error ?? "Az e-mail nem menthető.");
    if (response.ok) {
      setEmailDraft("");
      setEditingEmailId(null);
      router.refresh();
    }
  }

  async function deleteEmail(emailId: string) {
    const response = await fetch(`/api/businesses/${business.id}/emails?emailId=${encodeURIComponent(emailId)}`, { method: "DELETE" });
    setMessage(response.ok ? "E-mail törölve." : "Az e-mail nem törölhető.");
    if (response.ok) router.refresh();
  }

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">{business.display_name}</h1>
          <p className="mt-1 text-sm text-ink/65">{business.formatted_address ?? "Nincs cím megadva"}</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {business.website_url ? (
            <a href={business.website_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium">
              <ExternalLink className="size-4" aria-hidden="true" />
              Weboldal
            </a>
          ) : null}
          {business.google_maps_url ? (
            <a href={business.google_maps_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-md border border-line bg-white px-3 py-2 text-sm font-medium">
              <Map className="size-4" aria-hidden="true" />
              Google Maps
            </a>
          ) : null}
        </div>
      </div>

      {message ? <p className="rounded-md border border-line bg-white px-3 py-2 text-sm">{message}</p> : null}

      <form action={submit} className="grid gap-4 rounded-md border border-line bg-white p-5 md:grid-cols-2">
        {[
          ["displayName", "Vállalkozás neve", business.display_name, true],
          ["primaryCategory", "Kategória", business.primary_category ?? "", false],
          ["country", "Ország", business.country ?? "", false],
          ["region", "Régió/vármegye", business.region ?? "", false],
          ["city", "Város", business.city ?? "", false],
          ["phoneInternational", "Telefonszám", business.phone_international ?? business.phone_local ?? "", false],
          ["websiteUrl", "Weboldal", business.website_url ?? "", false]
        ].map(([name, label, value, required]) => (
          <label key={String(name)} className="text-sm font-medium">
            {label}
            <input name={String(name)} defaultValue={String(value)} required={Boolean(required)} className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15" />
          </label>
        ))}
        <label className="text-sm font-medium md:col-span-2">
          Cím
          <input name="formattedAddress" defaultValue={business.formatted_address ?? ""} className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15" />
        </label>
        <label className="text-sm font-medium">
          Státusz
          <select name="leadStatus" defaultValue={business.lead_status ?? "new"} className="mt-1 w-full rounded-md border border-line px-3 py-2">
            <option value="new">Új</option>
            <option value="contacted">Megkeresve</option>
            <option value="follow_up">Utánkövetés</option>
            <option value="interested">Érdeklődik</option>
            <option value="not_interested">Nem érdekli</option>
            <option value="converted">Konvertált</option>
          </select>
        </label>
        <label className="text-sm font-medium md:col-span-2">
          Saját megjegyzés
          <textarea name="notes" defaultValue={business.notes ?? ""} rows={4} className="mt-1 w-full rounded-md border border-line px-3 py-2 focus:border-forest focus:outline-none focus:ring-2 focus:ring-forest/15" />
        </label>
        <button disabled={isPending} className="inline-flex items-center justify-center gap-2 rounded-md bg-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
          <Save className="size-4" aria-hidden="true" />
          Mentés
        </button>
      </form>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-md border border-line bg-white p-5">
          <h2 className="font-semibold">E-mail-címek</h2>
          <div className="mt-3 space-y-2">
            {business.business_emails?.length ? (
              business.business_emails.map((email) => (
                <div key={email.id} className="flex items-center justify-between rounded-md border border-line px-3 py-2 text-sm">
                  <span>{email.email}</span>
                  <div className="flex items-center gap-2">
                    <button type="button" onClick={() => { setEditingEmailId(email.id); setEmailDraft(email.email); }} className="text-xs text-forest hover:underline">Módosítás</button>
                    <button type="button" onClick={() => void deleteEmail(email.id)} className="text-xs text-clay hover:underline">Törlés</button>
                  </div>
                  {email.is_primary ? <Badge tone="green">Elsődleges</Badge> : <Badge>Másodlagos</Badge>}
                </div>
              ))
            ) : (
              <p className="text-sm text-ink/60">Nincs mentett e-mail.</p>
            )}
          </div>
          <div className="mt-4 flex flex-col gap-2 sm:flex-row">
            <input
              aria-label="E-mail-cím"
              value={emailDraft}
              onChange={(event) => setEmailDraft(event.target.value)}
              placeholder="nev@ceg.hu"
              className="min-w-0 flex-1 rounded-md border border-line px-3 py-2 text-sm"
            />
            <button type="button" onClick={() => void saveEmail()} disabled={isPending || !emailDraft.trim()} className="rounded-md bg-forest px-3 py-2 text-sm font-semibold text-white disabled:opacity-50">
              {editingEmailId ? "Módosítás" : "Hozzáadás"}
            </button>
          </div>
          <button
            disabled={isPending || !business.website_url}
            onClick={() => runAction(`/api/businesses/${business.id}/crawl-email`, "Az e-mail-keresés sorba állt.")}
            className="mt-4 inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium disabled:opacity-50"
          >
            <MailSearch className="size-4" aria-hidden="true" />
            E-mail-keresés
          </button>
        </div>

        <div className="rounded-md border border-line bg-white p-5">
          <h2 className="font-semibold">Forrás és tagság</h2>
          <dl className="mt-3 grid grid-cols-2 gap-3 text-sm">
            <dt className="text-ink/60">Forrás</dt>
            <dd><Badge>{business.source}</Badge></dd>
            <dt className="text-ink/60">Google lekérés</dt>
            <dd>{business.google_fetched_at ? new Date(business.google_fetched_at).toLocaleString("hu-HU") : "-"}</dd>
            <dt className="text-ink/60">Listák</dt>
            <dd>{business.business_lists?.length ?? 0}</dd>
            <dt className="text-ink/60">Mappák</dt>
            <dd>{business.business_folders?.length ?? 0}</dd>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              disabled={isPending || !business.google_place_id}
              onClick={() => runAction(`/api/businesses/${business.id}/refresh-google`, "A Google-frissítés sorba állt.")}
              className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium disabled:opacity-50"
            >
              <RefreshCcw className="size-4" aria-hidden="true" />
              Google-frissítés
            </button>
            <button onClick={moveToTrash} className="inline-flex items-center gap-2 rounded-md border border-clay/30 px-3 py-2 text-sm font-medium text-clay">
              <Trash2 className="size-4" aria-hidden="true" />
              Lomtár
            </button>
          </div>
        </div>
      </section>
    </div>
  );
}
