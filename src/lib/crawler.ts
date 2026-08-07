import * as cheerio from "cheerio";
import { getDomain } from "tldts";
import { getServerEnv } from "@/lib/env";
import { extractEmailsFromHtml, type ExtractedEmail } from "@/lib/email-extractor";
import { normalizeUrl, sameRegistrableDomain } from "@/lib/normalizers";
import { assertPublicHttpUrl, UnsafeUrlError, type LookupFunction } from "@/lib/ssrf";

export type CrawlStatus =
  | "found"
  | "not_found"
  | "timeout"
  | "non_html"
  | "blocked"
  | "dns_error"
  | "invalid_url"
  | "failed";

export type CrawlResult = {
  status: CrawlStatus;
  emails: ExtractedEmail[];
  pagesChecked: number;
  contactPageUrl: string | null;
  errorMessage?: string;
};

export type CrawlOptions = {
  timeoutMs?: number;
  maxPages?: number;
  maxBytes?: number;
  userAgent?: string;
  lookup?: LookupFunction;
};

const contactKeywords = [
  "kapcsolat",
  "elerhetoseg",
  "elérhetőség",
  "rolunk",
  "rólunk",
  "impresszum",
  "contact",
  "about",
  "legal",
  "privacy",
  "adatvedelem",
  "adatvédelem"
];

function defaultOptions(): Required<Omit<CrawlOptions, "lookup">> {
  const env = getServerEnv();
  return {
    timeoutMs: env.CRAWLER_TIMEOUT_MS,
    maxPages: env.CRAWLER_MAX_PAGES_PER_BUSINESS,
    maxBytes: env.CRAWLER_MAX_RESPONSE_BYTES,
    userAgent: env.CRAWLER_USER_AGENT
  };
}

function keywordScore(value: string) {
  const normalized = value
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");

  return contactKeywords.reduce((score, keyword) => {
    const cleanKeyword = keyword.normalize("NFD").replace(/\p{Diacritic}/gu, "");
    return normalized.includes(cleanKeyword) ? score + 1 : score;
  }, 0);
}

async function readLimitedBody(response: Response, maxBytes: number) {
  if (!response.body) {
    return "";
  }

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel();
      throw new Error("A válasz túl nagy.");
    }

    chunks.push(value);
  }

  return new TextDecoder("utf-8", { fatal: false }).decode(Buffer.concat(chunks));
}

async function fetchWithSafety(
  rawUrl: string,
  options: Required<Omit<CrawlOptions, "lookup">> & Pick<CrawlOptions, "lookup">,
  requireHtml: boolean,
  redirectsLeft = 4
) {
  const safeUrl = await assertPublicHttpUrl(rawUrl, options.lookup);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options.timeoutMs);

  try {
    const response = await fetch(safeUrl, {
      headers: {
        "user-agent": options.userAgent,
        accept: requireHtml ? "text/html,application/xhtml+xml" : "text/plain,text/html,*/*;q=0.1"
      },
      redirect: "manual",
      signal: controller.signal
    });

    if (response.status >= 300 && response.status < 400 && response.headers.get("location")) {
      if (redirectsLeft <= 0) {
        throw new Error("Túl sok átirányítás.");
      }
      const redirectTarget = new URL(response.headers.get("location")!, safeUrl);
      return fetchWithSafety(redirectTarget.toString(), options, requireHtml, redirectsLeft - 1);
    }

    if (response.status === 401 || response.status === 403 || response.status === 429) {
      return { status: "blocked" as const, url: safeUrl.toString(), body: "", contentType: response.headers.get("content-type") ?? "" };
    }

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }

    const contentType = response.headers.get("content-type") ?? "";
    if (requireHtml && contentType && !contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      return { status: "non_html" as const, url: safeUrl.toString(), body: "", contentType };
    }

    const body = await readLimitedBody(response, options.maxBytes);
    return { status: "ok" as const, url: safeUrl.toString(), body, contentType };
  } finally {
    clearTimeout(timeout);
  }
}

function parseRobotsAllows(robots: string, path: string) {
  const lines = robots.split(/\r?\n/).map((line) => line.replace(/#.*/, "").trim());
  let applies = false;
  const disallows: string[] = [];

  for (const line of lines) {
    const [rawKey, ...rest] = line.split(":");
    if (!rawKey || rest.length === 0) {
      continue;
    }

    const key = rawKey.trim().toLowerCase();
    const value = rest.join(":").trim();

    if (key === "user-agent") {
      applies = value === "*" || value.toLowerCase().includes("leadgyujtobot");
      continue;
    }

    if (applies && key === "disallow" && value) {
      disallows.push(value);
    }
  }

  return !disallows.some((rule) => path.startsWith(rule));
}

async function allowedByRobots(homeUrl: URL, targetUrl: URL, options: Required<Omit<CrawlOptions, "lookup">> & Pick<CrawlOptions, "lookup">) {
  const robotsUrl = new URL("/robots.txt", homeUrl);
  try {
    const response = await fetchWithSafety(robotsUrl.toString(), options, false, 1);
    if (response.status !== "ok") {
      return true;
    }
    return parseRobotsAllows(response.body, targetUrl.pathname);
  } catch {
    return true;
  }
}

function findCandidateLinks(html: string, pageUrl: string, maxPages: number) {
  const $ = cheerio.load(html);
  const links = new Map<string, number>();
  const baseDomain = getDomain(pageUrl, { allowPrivateDomains: true });

  $("a[href]").each((_, element) => {
    const rawHref = $(element).attr("href");
    if (!rawHref) {
      return;
    }

    let target: URL;
    try {
      target = new URL(rawHref, pageUrl);
    } catch {
      return;
    }

    if (!baseDomain || getDomain(target.toString(), { allowPrivateDomains: true }) !== baseDomain) {
      return;
    }

    target.hash = "";
    const score = keywordScore(`${target.pathname} ${$(element).text()}`);
    if (score > 0) {
      links.set(target.toString(), Math.max(links.get(target.toString()) ?? 0, score));
    }
  });

  return [...links.entries()]
    .sort((left, right) => right[1] - left[1])
    .map(([url]) => url)
    .slice(0, Math.max(0, maxPages - 1));
}

function classifyError(error: unknown): CrawlStatus {
  if (error instanceof UnsafeUrlError) {
    if (error.message.includes("DNS")) {
      return "dns_error";
    }
    return "invalid_url";
  }

  if (error instanceof DOMException && error.name === "AbortError") {
    return "timeout";
  }

  if (error instanceof Error && error.message.includes("DNS")) {
    return "dns_error";
  }

  return "failed";
}

export async function crawlBusinessWebsite(rawWebsiteUrl: string, crawlOptions: CrawlOptions = {}): Promise<CrawlResult> {
  const normalized = normalizeUrl(rawWebsiteUrl);
  if (!normalized) {
    return { status: "invalid_url", emails: [], pagesChecked: 0, contactPageUrl: null, errorMessage: "Hibás weboldal URL." };
  }

  const options = { ...defaultOptions(), ...crawlOptions };
  const allEmails = new Map<string, ExtractedEmail>();
  let pagesChecked = 0;
  let contactPageUrl: string | null = null;

  try {
    const homeUrl = await assertPublicHttpUrl(normalized, options.lookup);
    const home = await fetchWithSafety(homeUrl.toString(), options, true);

    if (home.status === "blocked") {
      return { status: "blocked", emails: [], pagesChecked, contactPageUrl: null, errorMessage: "A weboldal blokkolta a hozzáférést." };
    }
    if (home.status === "non_html") {
      return { status: "non_html", emails: [], pagesChecked, contactPageUrl: null, errorMessage: "A főoldal nem HTML-tartalom." };
    }

    pagesChecked += 1;
    for (const item of extractEmailsFromHtml(home.body, home.url)) {
      allEmails.set(item.email, item);
    }

    const candidates = findCandidateLinks(home.body, home.url, options.maxPages);
    for (const candidate of candidates) {
      if (!sameRegistrableDomain(home.url, candidate)) {
        continue;
      }

      const targetUrl = await assertPublicHttpUrl(candidate, options.lookup);
      if (!(await allowedByRobots(homeUrl, targetUrl, options))) {
        continue;
      }

      const page = await fetchWithSafety(targetUrl.toString(), options, true);
      if (page.status !== "ok") {
        continue;
      }

      pagesChecked += 1;
      if (!contactPageUrl) {
        contactPageUrl = page.url;
      }

      for (const item of extractEmailsFromHtml(page.body, page.url)) {
        allEmails.set(item.email, item);
      }

      if (pagesChecked >= options.maxPages) {
        break;
      }
    }

    const emails = [...allEmails.values()];
    return {
      status: emails.length > 0 ? "found" : "not_found",
      emails,
      pagesChecked,
      contactPageUrl
    };
  } catch (error) {
    const status = classifyError(error);
    return {
      status,
      emails: [],
      pagesChecked,
      contactPageUrl,
      errorMessage: error instanceof Error ? error.message : "Ismeretlen feldolgozási hiba."
    };
  }
}
