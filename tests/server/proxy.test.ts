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

  it("admin pages without a session cookie go to the login, never into a locale", () => {
    expect(matches("/admin/bookings")).toBe(true);
    const res = proxy(new NextRequest("http://localhost/admin/bookings"));
    expect(res?.headers.get("location")).toBe("http://localhost/admin/login");
  });

  it("admin pages with a session cookie, and the login itself, pass through", () => {
    const withCookie = proxy(new NextRequest("http://localhost/admin/calendar", { headers: { cookie: "sv_admin=abc" } }));
    expect(withCookie?.headers.get("location") ?? null).toBeNull();
    const loginPage = proxy(new NextRequest("http://localhost/admin/login"));
    expect(loginPage?.headers.get("location") ?? null).toBeNull();
  });

  it("still sends bare pages to a locale", () => {
    expect(matches("/rooms")).toBe(true);
    const res = proxy(new NextRequest("http://localhost/rooms", { headers: { "accept-language": "en" } }));
    expect(res?.headers.get("location")).toBe("http://localhost/en/rooms");
  });
});
