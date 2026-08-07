import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

describe("Next.js middleware convention", () => {
  it("uses src/middleware.ts with a middleware export", () => {
    const middlewarePath = join(process.cwd(), "src", "middleware.ts");
    const proxyPath = join(process.cwd(), "src", "proxy.ts");
    const source = readFileSync(middlewarePath, "utf8");

    expect(existsSync(middlewarePath)).toBe(true);
    expect(existsSync(proxyPath)).toBe(false);
    expect(source).toContain("export async function middleware");
    expect(source).toContain("updateSession(request)");
  });
});
