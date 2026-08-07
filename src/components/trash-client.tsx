"use client";

import { useRouter } from "next/navigation";
import { RotateCcw } from "lucide-react";
import type { BusinessRow } from "@/lib/data/businesses";

export function TrashClient({ rows }: { rows: BusinessRow[] }) {
  const router = useRouter();

  async function restore(id: string) {
    await fetch(`/api/businesses/${id}`, { method: "PUT" });
    router.refresh();
  }

  return (
    <div className="divide-y divide-line rounded-md border border-line bg-white">
      {rows.map((row) => (
        <div key={row.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
          <div>
            <p className="font-medium">{row.display_name}</p>
            <p className="text-sm text-ink/60">{row.deleted_at ? new Date(row.deleted_at).toLocaleString("hu-HU") : ""}</p>
          </div>
          <button onClick={() => restore(row.id)} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium">
            <RotateCcw className="size-4" aria-hidden="true" />
            Visszaállítás
          </button>
        </div>
      ))}
    </div>
  );
}
