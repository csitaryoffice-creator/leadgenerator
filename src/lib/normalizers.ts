import { getDomain, parse } from "tldts";

const accentMap: Record<string, string> = {
  á: "a",
  é: "e",
  í: "i",
  ó: "o",
  ö: "o",
  ő: "o",
  ú: "u",
  ü: "u",
  ű: "u"
};

export function collapseWhitespace(value: string) {
  return value.replace(/\s+/g, " ").trim();
}

export function stripAccents(value: string) {
  return value
    .normalize("NFC")
    .split("")
    .map((char) => accentMap[char.toLowerCase()] ?? char)
    .join("");
}

export function normalizeComparableText(value: string | null | undefined) {
  if (!value) {
    return "";
  }

  return collapseWhitespace(stripAccents(value).toLowerCase())
    .replace(/[^\p{L}\p{N}\s.-]/gu, "")
    .trim();
}

export function normalizePhone(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const trimmed = value.trim();
  const leadingPlus = trimmed.startsWith("+") ? "+" : "";
  const digits = trimmed.replace(/[^\d]/g, "");

  if (digits.length < 6) {
    return null;
  }

  return `${leadingPlus}${digits}`;
}

export function normalizeEmail(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const email = value.trim().toLowerCase().replace(/^mailto:/, "");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return null;
  }

  return email;
}

export function normalizeUrl(value: string | null | undefined) {
  if (!value) {
    return null;
  }

  const withProtocol = /^https?:\/\//i.test(value) ? value : `https://${value}`;
  try {
    const url = new URL(withProtocol);
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

export function normalizeDomain(value: string | null | undefined) {
  const url = normalizeUrl(value);
  if (!url) {
    return null;
  }

  const domain = getDomain(url, { allowPrivateDomains: true });
  return domain?.toLowerCase() ?? null;
}

export function sameRegistrableDomain(left: string, right: string) {
  const leftDomain = getDomain(left, { allowPrivateDomains: true });
  const rightDomain = getDomain(right, { allowPrivateDomains: true });
  return Boolean(leftDomain && rightDomain && leftDomain.toLowerCase() === rightDomain.toLowerCase());
}

export function describeDomain(value: string) {
  const parsed = parse(value, { allowPrivateDomains: true });
  return {
    domain: parsed.domain?.toLowerCase() ?? null,
    hostname: parsed.hostname?.toLowerCase() ?? null,
    isIcann: parsed.isIcann,
    isPrivate: parsed.isPrivate
  };
}

export function normalizeAddressParts(parts: Array<string | null | undefined>) {
  return normalizeComparableText(parts.filter(Boolean).join(" "));
}
