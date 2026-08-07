"use client";

import { useRouter } from "next/navigation";
import { Square } from "lucide-react";
import { Badge } from "@/components/ui";

type Job = {
  id: string;
  status: string;
  category: string;
  country: string;
  region: string | null;
  city: string | null;
  processed_tasks_count: number;
  raw_records_count: number;
  excluded_records_count: number;
  saved_businesses_count: number;
  duplicate_businesses_count: number;
  crawled_websites_count: number;
  found_emails_count: number;
  error_message: string | null;
  created_at: string;
  finished_at: string | null;
};

function statusTone(status: string) {
  if (status === "completed") return "green";
  if (status === "failed" || status === "cancelled") return "red";
  if (status === "paused") return "amber";
  return "blue";
}

export function SearchJobsClient({ jobs }: { jobs: Job[] }) {
  const router = useRouter();

  async function cancel(id: string) {
    await fetch(`/api/search-jobs/${id}/cancel`, { method: "POST" });
    router.refresh();
  }

  return (
    <div className="space-y-3">
      {jobs.map((job) => (
        <article key={job.id} className="rounded-md border border-line bg-white p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h2 className="font-semibold">{job.category}</h2>
              <p className="mt-1 text-sm text-ink/60">{[job.city, job.region, job.country].filter(Boolean).join(", ")}</p>
            </div>
            <Badge tone={statusTone(job.status) as any}>{job.status}</Badge>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-3 text-sm md:grid-cols-7">
            <div><dt className="text-ink/55">Részfeladat</dt><dd className="font-medium">{job.processed_tasks_count}</dd></div>
            <div><dt className="text-ink/55">Nyers</dt><dd className="font-medium">{job.raw_records_count}</dd></div>
            <div><dt className="text-ink/55">Kizárt</dt><dd className="font-medium">{job.excluded_records_count}</dd></div>
            <div><dt className="text-ink/55">Új</dt><dd className="font-medium">{job.saved_businesses_count}</dd></div>
            <div><dt className="text-ink/55">Duplikáció</dt><dd className="font-medium">{job.duplicate_businesses_count}</dd></div>
            <div><dt className="text-ink/55">Weboldal</dt><dd className="font-medium">{job.crawled_websites_count}</dd></div>
            <div><dt className="text-ink/55">E-mail</dt><dd className="font-medium">{job.found_emails_count}</dd></div>
          </dl>
          {job.error_message ? <p className="mt-3 rounded-md border border-clay/25 bg-clay/10 px-3 py-2 text-sm text-clay">{job.error_message}</p> : null}
          {["queued", "running", "paused"].includes(job.status) ? (
            <button onClick={() => cancel(job.id)} className="mt-4 inline-flex items-center gap-2 rounded-md border border-clay/30 px-3 py-2 text-sm font-medium text-clay">
              <Square className="size-4" aria-hidden="true" />
              Megszakítás
            </button>
          ) : null}
        </article>
      ))}
    </div>
  );
}
