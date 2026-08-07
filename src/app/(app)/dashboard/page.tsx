import Link from "next/link";
import { Search } from "lucide-react";
import { Stat, Badge, EmptyState } from "@/components/ui";
import { requirePageUser } from "@/lib/auth";

export default async function DashboardPage() {
  const { user, supabase } = await requirePageUser();

  const [businesses, activeJobs, emails, latestJobs] = await Promise.all([
    supabase.from("businesses").select("id", { count: "exact", head: true }).eq("owner_id", user.id).is("deleted_at", null),
    supabase.from("search_jobs").select("id", { count: "exact", head: true }).eq("owner_id", user.id).in("status", ["queued", "running", "paused"]),
    supabase.from("business_emails").select("id", { count: "exact", head: true }).eq("owner_id", user.id),
    supabase.from("search_jobs").select("*").eq("owner_id", user.id).order("created_at", { ascending: false }).limit(5)
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Irányítópult</h1>
          <p className="mt-1 text-sm text-ink/65">Aktuális gyűjtési állapot és legutóbbi keresések.</p>
        </div>
        <Link href="/new-search" className="inline-flex items-center gap-2 rounded-md bg-forest px-4 py-2 text-sm font-semibold text-white">
          <Search className="size-4" aria-hidden="true" />
          Új keresés
        </Link>
      </div>

      <section className="grid gap-4 md:grid-cols-3">
        <Stat label="Vállalkozások" value={businesses.count ?? 0} hint="Aktív központi rekord" />
        <Stat label="Futó feladatok" value={activeJobs.count ?? 0} hint="Keresés vagy crawler" />
        <Stat label="E-mail-címek" value={emails.count ?? 0} hint="Mentett elérhetőség" />
      </section>

      <section className="rounded-md border border-line bg-white">
        <div className="border-b border-line px-4 py-3">
          <h2 className="font-semibold">Legutóbbi keresések</h2>
        </div>
        {latestJobs.data?.length ? (
          <div className="divide-y divide-line">
            {latestJobs.data.map((job: any) => (
              <div key={job.id} className="grid gap-2 px-4 py-3 text-sm md:grid-cols-[1fr_auto_auto] md:items-center">
                <div>
                  <p className="font-medium">{job.category}</p>
                  <p className="text-ink/60">{[job.city, job.region, job.country].filter(Boolean).join(", ")}</p>
                </div>
                <Badge tone={job.status === "completed" ? "green" : job.status === "failed" ? "red" : "blue"}>{job.status}</Badge>
                <span className="text-ink/60">{new Date(job.created_at).toLocaleString("hu-HU")}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-4">
            <EmptyState title="Még nincs keresés" body="Az első keresés után itt jelennek meg a háttérfeladatok." />
          </div>
        )}
      </section>
    </div>
  );
}
