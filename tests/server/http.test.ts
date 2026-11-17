import { describe, expect, it } from "vitest";
import { clientIp } from "@/lib/server/http";

const req = (headers: Record<string, string>) => new Request("http://localhost/x", { headers });

describe("clientIp (review I3)", () => {
  it("takes the address the host's proxy appended, not one the visitor wrote", () => {
    /* A visitor sends X-Forwarded-For: 6.6.6.6; the proxy appends the real address. */
    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6, 203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientIp(req({ "x-forwarded-for": "6.6.6.6,7.7.7.7, 203.0.113.9 " }))).toBe("203.0.113.9");
  });

  it("one hop, X-Real-IP, or nothing", () => {
    expect(clientIp(req({ "x-forwarded-for": "203.0.113.9" }))).toBe("203.0.113.9");
    expect(clientIp(req({ "x-real-ip": "198.51.100.4" }))).toBe("198.51.100.4");
    expect(clientIp(req({}))).toBe("local");
  });
});
