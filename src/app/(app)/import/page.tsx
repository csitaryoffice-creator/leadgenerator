import { ImportClient } from "@/components/import-client";

export default function ImportPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold">Import</h1>
        <p className="mt-1 text-sm text-ink/65">CSV és XLSX előnézet oszlop-hozzárendeléssel.</p>
      </div>
      <ImportClient />
    </div>
  );
}
