import { afterEach, describe, expect, it } from "vitest";
import { requestOrigin } from "@/lib/server/http";

const req = (headers: Record<string, string>, url = "http://127.0.0.1:3000/api/bookings") => new Request(url, { headers });
const saved = process.env.SITE_URL;
afterEach(() => {
  process.env.SITE_URL = saved;
});

describe("requestOrigin (where DOKU sends the guest back)", () => {
  it("SITE_URL wins once set", () => {
    process.env.SITE_URL = "https://sukavillage.com/";
    expect(requestOrigin(req({ host: "x.example" }))).toBe("https://sukavillage.com");
  });

  it("without SITE_URL: the host the hosting proxy forwards", () => {
    process.env.SITE_URL = "";
    expect(requestOrigin(req({ "x-forwarded-host": "staging.sukavillage.com", "x-forwarded-proto": "https", host: "127.0.0.1:3000" }))).toBe("https://staging.sukavillage.com");
  });

  it("without a proxy: the request's own host", () => {
    process.env.SITE_URL = "";
    expect(requestOrigin(req({ host: "localhost:3000" }))).toBe("http://localhost:3000");
  });
});
