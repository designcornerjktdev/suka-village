import { NextRequest } from "next/server";
import { unstable_doesMiddlewareMatch } from "next/experimental/testing/server";
import { describe, expect, it } from "vitest";
import { config, proxy } from "@/proxy";

const matches = (url: string) => unstable_doesMiddlewareMatch({ config, url, nextConfig: {} });

describe("proxy (locale redirect)", () => {
  it("never touches the API, the DOKU token endpoint or uploaded photos", () => {
    expect(matches("/api/rooms")).toBe(false);
    expect(matches("/api/webhooks/doku")).toBe(false);
    expect(matches("/authorization/v1/access-token/b2b")).toBe(false);
    expect(matches("/uploads/2027/abc.jpg")).toBe(false);
  });

  it("still sends bare pages to a locale", () => {
    expect(matches("/rooms")).toBe(true);
    const res = proxy(new NextRequest("http://localhost/rooms", { headers: { "accept-language": "en" } }));
    expect(res?.headers.get("location")).toBe("http://localhost/en/rooms");
  });
});
