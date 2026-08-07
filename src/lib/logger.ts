type LogLevel = "debug" | "info" | "warn" | "error";

const levels: Record<LogLevel, number> = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40
};

const secretKeys = [/key/i, /token/i, /secret/i, /password/i, /authorization/i, /cookie/i];

function scrub(value: unknown): unknown {
  if (value == null || typeof value !== "object") {
    return value;
  }

  if (Array.isArray(value)) {
    return value.map(scrub);
  }

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, nested]) => [
      key,
      secretKeys.some((pattern) => pattern.test(key)) ? "[REDACTED]" : scrub(nested)
    ])
  );
}

export function createCorrelationId() {
  return crypto.randomUUID();
}

export function log(level: LogLevel, message: string, meta: Record<string, unknown> = {}) {
  const configured = (process.env.LOG_LEVEL as LogLevel | undefined) ?? "info";
  if (levels[level] < levels[configured]) {
    return;
  }

  const payload = {
    level,
    message,
    at: new Date().toISOString(),
    ...(scrub(meta) as Record<string, unknown>)
  };

  const line = JSON.stringify(payload);
  if (level === "error") {
    console.error(line);
  } else if (level === "warn") {
    console.warn(line);
  } else {
    console.log(line);
  }
}
