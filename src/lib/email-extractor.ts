import * as cheerio from "cheerio";
import { normalizeEmail } from "@/lib/normalizers";

export type ExtractedEmail = {
  email: string;
  sourceUrl: string;
  source: "mailto" | "text" | "structured";
};

const emailRegex = /[a-z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-z0-9-]+(?:\.[a-z0-9-]+)+/gi;
const badEmailPatterns = [
  /^noreply@/i,
  /^no-reply@/i,
  /^donotreply@/i,
  /^example@/i,
  /@example\./i,
  /\.(png|jpe?g|gif|webp|svg|pdf)$/i
];

function unmaskText(text: string) {
  return text
    .replace(/\s*(\[|\(|\{)?\s*(kukac|at|@)\s*(\]|\)|\})?\s*/gi, "@")
    .replace(/\s*(\[|\(|\{)?\s*(pont|dot|\.)\s*(\]|\)|\})?\s*/gi, ".")
    .replace(/\s+@\s+/g, "@")
    .replace(/\s+\.\s+/g, ".");
}

function isUsefulEmail(email: string) {
  return !badEmailPatterns.some((pattern) => pattern.test(email));
}

function collectFromText(text: string, sourceUrl: string, source: ExtractedEmail["source"]) {
  const normalizedText = unmaskText(text);
  const matches = normalizedText.match(emailRegex) ?? [];

  return matches
    .map(normalizeEmail)
    .filter((email): email is string => Boolean(email && isUsefulEmail(email)))
    .map((email) => ({ email, sourceUrl, source }));
}

export function extractEmailsFromHtml(html: string, sourceUrl: string): ExtractedEmail[] {
  const $ = cheerio.load(html);
  const found = new Map<string, ExtractedEmail>();

  $("a[href^='mailto:']").each((_, element) => {
    const href = $(element).attr("href")?.split("?")[0] ?? "";
    for (const item of collectFromText(href, sourceUrl, "mailto")) {
      found.set(item.email, item);
    }
  });

  $("script[type='application/ld+json']").each((_, element) => {
    const raw = $(element).text();
    try {
      const parsed = JSON.parse(raw);
      const jsonText = JSON.stringify(parsed);
      for (const item of collectFromText(jsonText, sourceUrl, "structured")) {
        found.set(item.email, item);
      }
    } catch {
      for (const item of collectFromText(raw, sourceUrl, "structured")) {
        found.set(item.email, item);
      }
    }
  });

  $("script, style, noscript").remove();
  const visibleText = $("body").text();
  for (const item of collectFromText(visibleText, sourceUrl, "text")) {
    found.set(item.email, item);
  }

  return [...found.values()];
}
