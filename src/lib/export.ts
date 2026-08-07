import ExcelJS from "exceljs";
import type { BusinessRow } from "@/lib/data/businesses";

export type ExportColumn = {
  key: string;
  label: string;
  googleDerived?: boolean;
  value: (row: BusinessRow) => string | number | null;
};

function primaryEmail(row: BusinessRow) {
  const emails = row.business_emails ?? [];
  return emails.find((email) => email.is_primary)?.email ?? emails[0]?.email ?? null;
}

function allEmails(row: BusinessRow) {
  return (row.business_emails ?? []).map((email) => email.email).join(", ");
}

export const exportColumns: ExportColumn[] = [
  { key: "display_name", label: "Vállalkozás neve", googleDerived: true, value: (row) => row.display_name },
  { key: "primary_category", label: "Elsődleges kategória", googleDerived: true, value: (row) => row.primary_category },
  { key: "categories", label: "További kategóriák", googleDerived: true, value: (row) => row.categories?.join(", ") ?? "" },
  { key: "country", label: "Ország", googleDerived: true, value: (row) => row.country },
  { key: "region", label: "Régió/vármegye", googleDerived: true, value: (row) => row.region },
  { key: "city", label: "Város", googleDerived: true, value: (row) => row.city },
  { key: "formatted_address", label: "Cím", googleDerived: true, value: (row) => row.formatted_address },
  { key: "phone_international", label: "Telefonszám", googleDerived: true, value: (row) => row.phone_international ?? row.phone_local },
  { key: "website_url", label: "Weboldal", googleDerived: true, value: (row) => row.website_url },
  { key: "primary_email", label: "Elsődleges e-mail", value: primaryEmail },
  { key: "emails", label: "Összes e-mail", value: allEmails },
  { key: "contact_page_url", label: "Kapcsolati oldal", value: (row) => row.contact_page_url },
  { key: "google_place_id", label: "Google Place ID", value: (row) => row.google_place_id },
  { key: "google_maps_url", label: "Google Maps URL", googleDerived: true, value: (row) => row.google_maps_url },
  { key: "rating", label: "Értékelés", googleDerived: true, value: (row) => row.rating },
  { key: "rating_count", label: "Értékelések száma", googleDerived: true, value: (row) => row.rating_count },
  { key: "business_status", label: "Működési állapot", googleDerived: true, value: (row) => row.business_status },
  { key: "source", label: "Adatforrás", value: (row) => row.source },
  { key: "google_fetched_at", label: "Google lekérés ideje", value: (row) => row.google_fetched_at },
  { key: "notes", label: "Megjegyzés", value: (row) => row.notes },
  { key: "created_at", label: "Létrehozva", value: (row) => row.created_at },
  { key: "updated_at", label: "Módosítva", value: (row) => row.updated_at }
];

function isGoogleFresh(row: BusinessRow) {
  if (!row.google_cache_expires_at) {
    return row.source !== "google";
  }

  return new Date(row.google_cache_expires_at).getTime() > Date.now();
}

function isManualOverride(row: BusinessRow, key: string) {
  return Boolean(row.manual_overrides?.[key]);
}

export function selectExportColumns(keys?: string[]) {
  if (!keys || keys.length === 0) {
    return exportColumns;
  }

  const wanted = new Set(keys);
  return exportColumns.filter((column) => wanted.has(column.key));
}

export function buildExportMatrix(rows: BusinessRow[], selectedColumns = exportColumns) {
  const header = selectedColumns.map((column) => column.label);
  const body = rows.map((row) =>
    selectedColumns.map((column) => {
      const expiredGoogleField = column.googleDerived && row.source === "google" && !isGoogleFresh(row) && !isManualOverride(row, column.key);
      if (expiredGoogleField) {
        return "";
      }

      const value = column.value(row);
      return value == null ? "" : String(value);
    })
  );

  return [header, ...body];
}

function csvEscape(value: string) {
  if (/[",\n\r;]/.test(value)) {
    return `"${value.replaceAll('"', '""')}"`;
  }

  return value;
}

export function buildCsv(rows: BusinessRow[], columns = exportColumns) {
  const matrix = buildExportMatrix(rows, columns);
  return `\uFEFF${matrix.map((line) => line.map(csvEscape).join(";")).join("\r\n")}`;
}

export async function buildXlsx(rows: BusinessRow[], columns = exportColumns) {
  const workbook = new ExcelJS.Workbook();
  workbook.creator = "Leadgyűjtő";
  workbook.created = new Date();
  const sheet = workbook.addWorksheet("Vállalkozások");
  const matrix = buildExportMatrix(rows, columns);

  sheet.addRows(matrix);
  sheet.getRow(1).font = { bold: true };
  sheet.columns.forEach((column) => {
    column.width = Math.min(48, Math.max(16, ...((column.values ?? []).map((value) => String(value ?? "").length) as number[])));
  });

  return Buffer.from(await workbook.xlsx.writeBuffer());
}
