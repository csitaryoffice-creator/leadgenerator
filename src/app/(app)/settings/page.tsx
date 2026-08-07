import { getServerEnv } from "@/lib/env";
import { requirePageUser } from "@/lib/auth";

export default async function SettingsPage() {
  await requirePageUser();
  const env = getServerEnv();
  const safeSettings = [
    ["Engedélyezett e-mail", env.ALLOWED_USER_EMAIL],
    ["Havi Google API-limit", env.GOOGLE_MONTHLY_REQUEST_LIMIT],
    ["Crawler időkorlát", `${env.CRAWLER_TIMEOUT_MS} ms`],
    ["Crawler oldalkorlát", env.CRAWLER_MAX_PAGES_PER_BUSINESS],
    ["Crawler válaszméret", `${env.CRAWLER_MAX_RESPONSE_BYTES} byte`],
    ["Crawler párhuzamosság", env.CRAWLER_CONCURRENCY],
    ["Publikus alap URL", env.APP_PUBLIC_BASE_URL]
  ];

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Beállítások</h1>
        <p className="mt-1 text-sm text-ink/65">Csak nem titkos működési értékek.</p>
      </div>
      <section className="divide-y divide-line rounded-md border border-line bg-white">
        {safeSettings.map(([label, value]) => (
          <div key={String(label)} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-2">
            <dt className="font-medium">{label}</dt>
            <dd className="text-ink/70">{String(value)}</dd>
          </div>
        ))}
      </section>
    </div>
  );
}
