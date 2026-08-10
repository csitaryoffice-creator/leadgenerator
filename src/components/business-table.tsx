"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMemo, useState, useTransition } from "react";
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  useReactTable
} from "@tanstack/react-table";
import { ArrowDownUp, Download, ExternalLink, Mail, Trash2 } from "lucide-react";
import type { BusinessRow } from "@/lib/data/businesses";
import { Badge } from "@/components/ui";

const columnHelper = createColumnHelper<BusinessRow>();

const statusOptions = [
  ["new", "Új"],
  ["contacted", "Megkeresve"],
  ["follow_up", "Utánkövetés"],
  ["interested", "Érdeklődik"],
  ["not_interested", "Nem érdekli"],
  ["converted", "Konvertált"]
] as const;

function displayEmail(row: BusinessRow) {
  return row.business_emails?.find((email) => email.is_primary)?.email ?? row.business_emails?.[0]?.email ?? "";
}

export function BusinessTable({
  rows,
  total,
  page,
  pageSize
}: {
  rows: BusinessRow[];
  total: number;
  page: number;
  pageSize: number;
}) {
  const router = useRouter();
  const [selected, setSelected] = useState<Record<string, boolean>>({});
  const [isPending, startTransition] = useTransition();
  const [statusPending, setStatusPending] = useState<string | null>(null);

  async function updateStatus(id: string, leadStatus: string) {
    setStatusPending(id);
    await fetch(`/api/businesses/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ leadStatus })
    });
    setStatusPending(null);
    router.refresh();
  }

  const columns = useMemo(
    () => [
      columnHelper.display({
        id: "select",
        header: () => <span className="sr-only">Kijelölés</span>,
        cell: ({ row }) => (
          <input
            aria-label="Sor kijelölése"
            type="checkbox"
            checked={Boolean(selected[row.original.id])}
            onChange={(event) => setSelected((state) => ({ ...state, [row.original.id]: event.target.checked }))}
            className="size-4 accent-forest"
          />
        )
      }),
      columnHelper.accessor("display_name", {
        header: "Név",
        cell: ({ row, getValue }) => (
          <Link className="font-medium text-forest hover:underline" href={`/businesses/${row.original.id}`}>
            {getValue()}
          </Link>
        )
      }),
      columnHelper.accessor("primary_category", { header: "Kategória", cell: (info) => info.getValue() ?? "-" }),
      columnHelper.accessor("city", { header: "Város", cell: (info) => info.getValue() ?? "-" }),
      columnHelper.accessor("lead_status", {
        header: "Státusz",
        cell: ({ row }) => (
          <select
            aria-label={`${row.original.display_name} státusza`}
            value={row.original.lead_status ?? "new"}
            disabled={statusPending === row.original.id}
            onClick={(event) => event.stopPropagation()}
            onChange={(event) => void updateStatus(row.original.id, event.target.value)}
            className="rounded-md border border-line bg-white px-2 py-1 text-xs font-medium"
          >
            {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
        )
      }),
      columnHelper.accessor("website_url", {
        header: "Weboldal",
        cell: (info) =>
          info.getValue() ? (
            <a href={info.getValue()!} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-sky hover:underline">
              Megnyitás
              <ExternalLink className="size-3" aria-hidden="true" />
            </a>
          ) : (
            "-"
          )
      }),
      columnHelper.display({ id: "email", header: "E-mail", cell: ({ row }) => displayEmail(row.original) || "-" }),
      columnHelper.accessor("rating", { header: "Értékelés", cell: (info) => info.getValue() ?? "-" }),
      columnHelper.accessor("source", { header: "Forrás", cell: (info) => <Badge>{info.getValue()}</Badge> })
    ],
    [selected, statusPending]
  );

  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true,
    manualSorting: true
  });

  const selectedIds = Object.entries(selected).filter(([, value]) => value).map(([id]) => id);
  const pageCount = Math.max(1, Math.ceil(total / pageSize));

  function exportSelection(format: "csv" | "xlsx") {
    startTransition(async () => {
      const response = await fetch("/api/export", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ format, selectedIds: selectedIds.length ? selectedIds : undefined })
      });
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = format === "csv" ? "leadgyujto-export.csv" : "leadgyujto-export.xlsx";
      link.click();
      URL.revokeObjectURL(url);
    });
  }

  async function softDelete(id: string) {
    await fetch(`/api/businesses/${id}`, { method: "DELETE" });
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-md border border-line bg-white p-3">
        <p className="text-sm text-ink/70">
          Találatok: <strong>{total}</strong> · Kijelölve: <strong>{selectedIds.length}</strong>
        </p>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => exportSelection("csv")} disabled={isPending} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-mist">
            <Download className="size-4" aria-hidden="true" />
            CSV
          </button>
          <button onClick={() => exportSelection("xlsx")} disabled={isPending} className="inline-flex items-center gap-2 rounded-md border border-line px-3 py-2 text-sm font-medium hover:bg-mist">
            <Download className="size-4" aria-hidden="true" />
            XLSX
          </button>
        </div>
      </div>

      <div className="hidden overflow-hidden rounded-md border border-line bg-white md:block">
        <table className="w-full border-collapse text-sm">
          <thead className="bg-mist text-left text-xs uppercase tracking-normal text-ink/60">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="border-b border-line px-3 py-3 font-semibold">
                    <span className="inline-flex items-center gap-2">
                      {flexRender(header.column.columnDef.header, header.getContext())}
                      {header.column.getCanSort() ? <ArrowDownUp className="size-3" aria-hidden="true" /> : null}
                    </span>
                  </th>
                ))}
                <th className="border-b border-line px-3 py-3" />
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.map((row) => (
              <tr key={row.original.id} onClick={(event) => {
                if ((event.target as HTMLElement).closest("a,button,input,select")) return;
                router.push(`/businesses/${row.original.id}`);
              }} className={`cursor-pointer border-b border-line last:border-0 hover:bg-mist/70 ${row.original.lead_status === "converted" ? "bg-forest/5" : row.original.lead_status === "not_interested" ? "bg-clay/5" : ""}`}>
                {row.getVisibleCells().map((cell) => (
                  <td key={cell.id} className="px-3 py-3 align-top">
                    {flexRender(cell.column.columnDef.cell, cell.getContext())}
                  </td>
                ))}
                <td className="px-3 py-3 text-right">
                  <button onClick={() => softDelete(row.original.id)} aria-label="Lomtárba helyezés" className="rounded-md border border-line p-2 text-clay hover:bg-clay/10">
                    <Trash2 className="size-4" aria-hidden="true" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="space-y-3 md:hidden">
        {rows.map((row) => (
          <article key={row.id} onClick={(event) => {
            if ((event.target as HTMLElement).closest("a,button,input,select")) return;
            router.push(`/businesses/${row.id}`);
          }} className={`cursor-pointer rounded-md border border-line bg-white p-4 ${row.lead_status === "converted" ? "bg-forest/5" : row.lead_status === "not_interested" ? "bg-clay/5" : ""}`}>
            <Link href={`/businesses/${row.id}`} className="font-semibold text-forest">
              {row.display_name}
            </Link>
            <p className="mt-1 text-sm text-ink/65">{[row.primary_category, row.city].filter(Boolean).join(" · ") || "Nincs kategória"}</p>
            <select
              aria-label={`${row.display_name} státusza`}
              value={row.lead_status ?? "new"}
              disabled={statusPending === row.id}
              onClick={(event) => event.stopPropagation()}
              onChange={(event) => void updateStatus(row.id, event.target.value)}
              className="mt-3 rounded-md border border-line bg-white px-2 py-1 text-xs font-medium"
            >
              {statusOptions.map(([value, label]) => <option key={value} value={value}>{label}</option>)}
            </select>
            <div className="mt-3 flex flex-wrap gap-2 text-xs">
              {displayEmail(row) ? <Badge tone="green"><Mail className="mr-1 size-3" aria-hidden="true" /> E-mail</Badge> : <Badge>Nincs e-mail</Badge>}
              {row.website_url ? <Badge tone="blue">Weboldal</Badge> : <Badge>Nincs weboldal</Badge>}
            </div>
          </article>
        ))}
      </div>

      <div className="flex items-center justify-between rounded-md border border-line bg-white p-3 text-sm">
        <Link aria-disabled={page <= 1} className="rounded-md border border-line px-3 py-2 aria-disabled:opacity-40" href={`?page=${Math.max(1, page - 1)}&pageSize=${pageSize}`}>
          Előző
        </Link>
        <span>
          {page} / {pageCount}
        </span>
        <Link aria-disabled={page >= pageCount} className="rounded-md border border-line px-3 py-2 aria-disabled:opacity-40" href={`?page=${Math.min(pageCount, page + 1)}&pageSize=${pageSize}`}>
          Következő
        </Link>
      </div>
    </div>
  );
}
