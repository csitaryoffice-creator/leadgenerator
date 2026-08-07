import { Stat } from "@/components/ui";
import { getServerEnv } from "@/lib/env";
import { requirePageUser } from "@/lib/auth";

export default async function ApiUsagePage() {
  const { user, supabase } = await requirePageUser();
  const monthStart = new Date();
  monthStart.setUTCDate(1);
  monthStart.setUTCHours(0, 0, 0, 0);

  const [current, details] = await Promise.all([
    supabase.from("api_usage_months").select("*").eq("owner_id", user.id).eq("month_start", monthStart.toISOString().slice(0, 10)).maybeSingle(),
    supabase.from("api_usage").select("*").eq("owner_id", user.id).order("month_start", { ascending: false }).limit(100)
  ]);

  const limit = current.data?.monthly_limit ?? getServerEnv().GOOGLE_MONTHLY_REQUEST_LIMIT;
  const used = current.data?.used_count ?? 0;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">API-használat</h1>
        <p className="mt-1 text-sm text-ink/65">Alkalmazásszintű havi Google Places hard limit.</p>
      </div>
      <section className="grid gap-4 md:grid-cols-3">
        <Stat label="Aktuális hónap" value={used} hint="Felhasznált Google-hívás" />
        <Stat label="Limit" value={limit} hint="Környezeti változóból állítható" />
        <Stat label="Hátralévő" value={Math.max(0, limit - used)} hint="Atomi foglalás alapján" />
      </section>
      <section className="overflow-hidden rounded-md border border-line bg-white">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-mist text-left">
            <tr>
              <th className="border-b border-line px-3 py-2">Hónap</th>
              <th className="border-b border-line px-3 py-2">Végpont</th>
              <th className="border-b border-line px-3 py-2">Kategória</th>
              <th className="border-b border-line px-3 py-2">Hívás</th>
            </tr>
          </thead>
          <tbody>
            {(details.data ?? []).map((row: any) => (
              <tr key={row.id} className="border-b border-line">
                <td className="px-3 py-2">{row.month_start}</td>
                <td className="px-3 py-2">{row.endpoint}</td>
                <td className="px-3 py-2">{row.billing_category}</td>
                <td className="px-3 py-2">{row.used_count}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>
    </div>
  );
}
