import dns from "node:dns/promises";
import net from "node:net";

export type LookupAddress = {
  address: string;
  family: number;
};

export type LookupFunction = (hostname: string) => Promise<LookupAddress[]>;

export class UnsafeUrlError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "UnsafeUrlError";
  }
}

const blockedHostnames = new Set(["localhost", "localhost.localdomain"]);

function isIPv4Private(address: string) {
  const parts = address.split(".").map((part) => Number(part));
  if (parts.length !== 4 || parts.some((part) => Number.isNaN(part) || part < 0 || part > 255)) {
    return true;
  }

  const [a, b] = parts;
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

function isIPv6Private(address: string) {
  const normalized = address.toLowerCase();
  return (
    normalized === "::1" ||
    normalized === "::" ||
    normalized.startsWith("fc") ||
    normalized.startsWith("fd") ||
    normalized.startsWith("fe80") ||
    normalized.startsWith("::ffff:10.") ||
    normalized.startsWith("::ffff:127.") ||
    normalized.startsWith("::ffff:169.254.") ||
    normalized.startsWith("::ffff:172.") ||
    normalized.startsWith("::ffff:192.168.")
  );
}

export function isPrivateIp(address: string) {
  const family = net.isIP(address);
  if (family === 4) {
    return isIPv4Private(address);
  }
  if (family === 6) {
    return isIPv6Private(address);
  }
  return true;
}

export function parseHttpUrl(rawUrl: string) {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new UnsafeUrlError("A weboldal URL hibás.");
  }

  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new UnsafeUrlError("Csak HTTP vagy HTTPS weboldal vizsgálható.");
  }

  const hostname = url.hostname.toLowerCase();
  if (blockedHostnames.has(hostname) || hostname.endsWith(".localhost")) {
    throw new UnsafeUrlError("Belső hálózati cím nem vizsgálható.");
  }

  if (net.isIP(hostname) && isPrivateIp(hostname)) {
    throw new UnsafeUrlError("Privát vagy helyi IP-cím nem vizsgálható.");
  }

  url.username = "";
  url.password = "";
  return url;
}

export async function defaultLookup(hostname: string) {
  const result = await dns.lookup(hostname, { all: true, verbatim: true });
  return result.map((item) => ({ address: item.address, family: item.family }));
}

export async function assertPublicHttpUrl(rawUrl: string, lookup: LookupFunction = defaultLookup) {
  const url = parseHttpUrl(rawUrl);
  const hostname = url.hostname;

  if (!net.isIP(hostname)) {
    let addresses: LookupAddress[];
    try {
      addresses = await lookup(hostname);
    } catch {
      throw new UnsafeUrlError("DNS-hiba történt a weboldal ellenőrzésekor.");
    }

    if (addresses.length === 0 || addresses.some((entry) => isPrivateIp(entry.address))) {
      throw new UnsafeUrlError("A weboldal privát vagy belső hálózati címre mutat.");
    }
  }

  return url;
}
