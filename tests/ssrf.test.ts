import { describe, expect, it } from "vitest";
import { assertPublicHttpUrl, isPrivateIp, parseHttpUrl } from "@/lib/ssrf";

describe("SSRF védelem", () => {
  it("tiltja a privát és helyi IP-címeket", () => {
    expect(isPrivateIp("127.0.0.1")).toBe(true);
    expect(isPrivateIp("10.0.0.5")).toBe(true);
    expect(isPrivateIp("192.168.1.10")).toBe(true);
    expect(isPrivateIp("8.8.8.8")).toBe(false);
  });

  it("csak http/https protokollt enged", () => {
    expect(() => parseHttpUrl("file:///etc/passwd")).toThrow();
    expect(() => parseHttpUrl("http://localhost")).toThrow();
    expect(parseHttpUrl("https://example.hu").hostname).toBe("example.hu");
  });

  it("DNS feloldás után is tiltja a privát célpontot", async () => {
    await expect(
      assertPublicHttpUrl("https://example.test", async () => [{ address: "169.254.1.1", family: 4 }])
    ).rejects.toThrow();
  });
});
