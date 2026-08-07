"use client";

import { useState, useTransition } from "react";
import { Upload } from "lucide-react";

type Preview = {
  filename: string;
  headers: string[];
  suggestedMapping: Record<string, string>;
  rows: Array<Record<string, string>>;
  validRows: number;
  invalidRows: number;
  errors: Array<{ row: number; message: string }>;
};

export function ImportClient() {
  const [preview, setPreview] = useState<Preview | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const [summary, setSummary] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  function submit(formData: FormData) {
    setError(null);
    startTransition(async () => {
      const response = await fetch("/api/import/preview", {
        method: "POST",
        body: formData
      });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Az import előnézet nem készíthető el.");
        return;
      }
      setFile(formData.get("file") as File);
      setSummary(null);
      setPreview(payload.preview);
    });
  }

  function commit() {
    if (!preview || !file) return;
    setError(null);
    startTransition(async () => {
      const formData = new FormData();
      formData.set("file", file);
      formData.set("mapping", JSON.stringify(preview.suggestedMapping));
      const response = await fetch("/api/import/commit", { method: "POST", body: formData });
      const payload = await response.json();
      if (!response.ok) {
        setError(payload.error ?? "Az import nem menthető.");
        return;
      }
      setSummary(`Importált sor: ${payload.importedRows} · Duplikáció: ${payload.duplicateRows} · Hibás sor: ${payload.invalidRows}`);
    });
  }

  return (
    <div className="space-y-5">
      <form action={submit} className="rounded-md border border-line bg-white p-5">
        {error ? <p className="mb-3 rounded-md border border-clay/25 bg-clay/10 px-3 py-2 text-sm text-clay">{error}</p> : null}
        <label className="block text-sm font-medium">
          CSV vagy XLSX fájl
          <input name="file" type="file" accept=".csv,.xlsx,.xls" required className="mt-2 w-full rounded-md border border-line px-3 py-2" />
        </label>
        <button disabled={isPending} className="mt-4 inline-flex items-center gap-2 rounded-md bg-forest px-4 py-2 text-sm font-semibold text-white">
          <Upload className="size-4" aria-hidden="true" />
          Előnézet
        </button>
      </form>

      {preview ? (
        <section className="rounded-md border border-line bg-white p-5">
          <h2 className="font-semibold">{preview.filename}</h2>
          <p className="mt-2 text-sm text-ink/65">
            Érvényes sor: {preview.validRows} · Hibás sor: {preview.invalidRows}
          </p>
          <div className="mt-4 overflow-x-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr>
                  {preview.headers.map((header) => (
                    <th key={header} className="border-b border-line px-3 py-2 text-left">
                      {header}
                      <span className="block text-xs font-normal text-ink/55">{preview.suggestedMapping[header] ?? "-"}</span>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row, index) => (
                  <tr key={index} className="border-b border-line">
                    {preview.headers.map((header) => (
                      <td key={header} className="px-3 py-2">
                        {row[header]}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {summary ? <p className="mt-4 rounded-md border border-forest/20 bg-forest/10 px-3 py-2 text-sm text-forest">{summary}</p> : null}
          <button onClick={commit} disabled={isPending} className="mt-4 inline-flex items-center gap-2 rounded-md bg-forest px-4 py-2 text-sm font-semibold text-white disabled:opacity-60">
            <Upload className="size-4" aria-hidden="true" />
            Import mentése
          </button>
        </section>
      ) : null}
    </div>
  );
}
