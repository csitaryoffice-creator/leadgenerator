import ExcelJS from "exceljs";
import Papa from "papaparse";
import { z } from "zod";
import { normalizeComparableText, normalizeEmail, normalizePhone, normalizeUrl } from "@/lib/normalizers";

export type ImportPreview = {
  filename: string;
  headers: string[];
  suggestedMapping: Record<string, string>;
  rows: Array<Record<string, string>>;
  validRows: number;
  invalidRows: number;
  errors: Array<{ row: number; message: string }>;
};

const importSchema = z.object({
  displayName: z.string().min(1),
  primaryCategory: z.string().optional(),
  country: z.string().optional(),
  region: z.string().optional(),
  city: z.string().optional(),
  formattedAddress: z.string().optional(),
  phone: z.string().optional(),
  websiteUrl: z.string().optional(),
  email: z.string().optional(),
  notes: z.string().optional()
});

const fieldAliases: Record<string, string[]> = {
  displayName: ["nev", "név", "vallalkozas", "vállalkozás", "cegnev", "cégnév", "company", "name"],
  primaryCategory: ["kategoria", "kategória", "category"],
  country: ["orszag", "ország", "country"],
  region: ["regio", "régió", "megye", "varmegye", "vármegye", "region"],
  city: ["varos", "város", "telepules", "település", "city"],
  formattedAddress: ["cim", "cím", "address"],
  phone: ["telefon", "phone", "tel"],
  websiteUrl: ["weboldal", "website", "url"],
  email: ["email", "e-mail", "mail"],
  notes: ["megjegyzes", "megjegyzés", "notes"]
};

function suggestMapping(headers: string[]) {
  const result: Record<string, string> = {};
  for (const header of headers) {
    const normalized = normalizeComparableText(header);
    for (const [field, aliases] of Object.entries(fieldAliases)) {
      if (aliases.some((alias) => normalized.includes(normalizeComparableText(alias)))) {
        result[header] = field;
      }
    }
  }
  return result;
}

function validateRows(rows: Array<Record<string, string>>, mapping: Record<string, string>) {
  let validRows = 0;
  const errors: Array<{ row: number; message: string }> = [];

  rows.forEach((row, index) => {
    const mapped: Record<string, string> = {};
    for (const [header, field] of Object.entries(mapping)) {
      mapped[field] = row[header] ?? "";
    }

    if (mapped.phone) mapped.phone = normalizePhone(mapped.phone) ?? mapped.phone;
    if (mapped.websiteUrl) mapped.websiteUrl = normalizeUrl(mapped.websiteUrl) ?? mapped.websiteUrl;
    if (mapped.email) mapped.email = normalizeEmail(mapped.email) ?? mapped.email;

    const parsed = importSchema.safeParse(mapped);
    if (parsed.success) {
      validRows += 1;
    } else {
      errors.push({ row: index + 2, message: parsed.error.issues.map((issue) => issue.message).join(", ") });
    }
  });

  return { validRows, invalidRows: errors.length, errors };
}

export async function readImportRows(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  let rows: Array<Record<string, string>> = [];
  let headers: string[] = [];

  if (extension === "csv") {
    const text = await file.text();
    const parsed = Papa.parse<Record<string, string>>(text, {
      header: true,
      skipEmptyLines: true
    });
    rows = parsed.data;
    headers = parsed.meta.fields ?? Object.keys(rows[0] ?? {});
  } else if (extension === "xlsx" || extension === "xls") {
    const workbook = new ExcelJS.Workbook();
    await workbook.xlsx.load(await file.arrayBuffer());
    const sheet = workbook.worksheets[0];
    headers = ((sheet.getRow(1).values as unknown[]) ?? []).slice(1).map((value) => String(value ?? ""));
    sheet.eachRow((row, rowNumber) => {
      if (rowNumber === 1) return;
      const item: Record<string, string> = {};
      headers.forEach((header, index) => {
        item[header] = String(row.getCell(index + 1).value ?? "");
      });
      rows.push(item);
    });
  } else {
    throw new Error("Csak CSV vagy XLSX fájl importálható.");
  }

  return { rows, headers };
}

export function mapImportRow(row: Record<string, string>, mapping: Record<string, string>) {
  const mapped: Record<string, string> = {};
  for (const [header, field] of Object.entries(mapping)) {
    mapped[field] = row[header] ?? "";
  }

  if (mapped.phone) mapped.phone = normalizePhone(mapped.phone) ?? mapped.phone;
  if (mapped.websiteUrl) mapped.websiteUrl = normalizeUrl(mapped.websiteUrl) ?? mapped.websiteUrl;
  if (mapped.email) mapped.email = normalizeEmail(mapped.email) ?? mapped.email;

  return importSchema.safeParse(mapped);
}

export async function previewImport(file: File): Promise<ImportPreview> {
  const { rows, headers } = await readImportRows(file);
  const suggestedMapping = suggestMapping(headers);
  const validation = validateRows(rows, suggestedMapping);

  return {
    filename: file.name,
    headers,
    suggestedMapping,
    rows: rows.slice(0, 25),
    ...validation
  };
}
