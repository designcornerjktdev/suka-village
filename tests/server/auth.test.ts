import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { createAdmin } from "@/lib/server/admins";
import { ADMIN_COOKIE, getAdmin, login, requireAdmin, SESSION_DAYS } from "@/lib/server/auth";
import { POST as loginRoute } from "@/app/api/admin/login/route";
import { POST as logoutRoute } from "@/app/api/admin/logout/route";
import { GET as meRoute } from "@/app/api/admin/me/route";
import { resetDb } from "../setup";

let ip = 0;
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://localhost${path}`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `10.5.0.${++ip}`, ...headers }, body: JSON.stringify(body) });
const cookieOf = (res: Response) => res.headers.get("set-cookie") ?? "";
const tokenFrom = (setCookie: string) => setCookie.match(new RegExp(`${ADMIN_COOKIE}=([^;]+)`))?.[1] ?? "";

beforeEach(async () => {
  await resetDb();
  await createAdmin(db, "owner@sukavillage.com", "kata-sandi-panjang");
});

describe("login", () => {
  it("right password → a session token, stored only as a hash", async () => {
    const r = await login("Owner@SukaVillage.com ", "kata-sandi-panjang");
    expect(r).not.toBeNull();
    const row = await db.session.findFirstOrThrow();
    expect(row.tokenHash).not.toContain(r!.token);
    expect(await getAdmin(r!.token)).toMatchObject({ email: "owner@sukavillage.com" });
  });

  it("wrong password or unknown email → null", async () => {
    expect(await login("owner@sukavillage.com", "salah-salah-salah")).toBeNull();
    expect(await login("orang@lain.com", "kata-sandi-panjang")).toBeNull();
  });

  it("an expired session is refused", async () => {
    const r = await login("owner@sukavillage.com", "kata-sandi-panjang");
    await db.session.updateMany({ data: { expiresAt: new Date(Date.now() - 1000) } });
    expect(await getAdmin(r!.token)).toBeNull();
    expect(await getAdmin("")).toBeNull();
    expect(await getAdmin("bukan-token")).toBeNull();
  });
});

describe("routes", () => {
  it("POST /api/admin/login sets an httpOnly cookie for 14 days", async () => {
    const res = await loginRoute(post("/api/admin/login", { email: "owner@sukavillage.com", password: "kata-sandi-panjang" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true, email: "owner@sukavillage.com" });
    const c = cookieOf(res);
    expect(c).toContain(`${ADMIN_COOKIE}=`);
    expect(c).toMatch(/HttpOnly/i);
    expect(c).toMatch(/SameSite=Lax/i);
    expect(c).toMatch(/Path=\//);
    expect(c).toContain(`Max-Age=${SESSION_DAYS * 24 * 3600}`);
  });

  it("wrong password → 401, no cookie; the same answer for an unknown email", async () => {
    const a = await loginRoute(post("/api/admin/login", { email: "owner@sukavillage.com", password: "salah-salah-salah" }));
    const b = await loginRoute(post("/api/admin/login", { email: "x@y.com", password: "salah-salah-salah" }));
    expect([a.status, b.status]).toEqual([401, 401]);
    expect(await a.text()).toBe(await b.text());
    expect(cookieOf(a)).toBe("");
  });

  it("the 6th login attempt from one address in a minute → 429", async () => {
    const from = { "x-forwarded-for": "10.5.9.9" };
    const minute = Math.floor(Date.now() / 60_000) * 60_000;
    await db.rateHit.createMany({ data: [minute, minute + 60_000].map((t) => ({ key: "login:10.5.9.9", windowStart: new Date(t), count: 5 })) });
    const res = await loginRoute(post("/api/admin/login", { email: "owner@sukavillage.com", password: "kata-sandi-panjang" }, from));
    expect(res.status).toBe(429);
  });

  it("me answers with the admin, logout ends the session", async () => {
    const res = await loginRoute(post("/api/admin/login", { email: "owner@sukavillage.com", password: "kata-sandi-panjang" }));
    const cookie = `${ADMIN_COOKIE}=${tokenFrom(cookieOf(res))}`;
    const me = await meRoute(new Request("http://localhost/api/admin/me", { headers: { cookie } }));
    expect(await me.json()).toEqual({ email: "owner@sukavillage.com" });
    const out = await logoutRoute(new Request("http://localhost/api/admin/logout", { method: "POST", headers: { cookie } }));
    expect(cookieOf(out)).toContain("Max-Age=0");
    expect((await meRoute(new Request("http://localhost/api/admin/me", { headers: { cookie } }))).status).toBe(401);
  });
});

describe("requireAdmin", () => {
  it("a Response(401) without a valid cookie, the admin with one", async () => {
    const none = await requireAdmin(new Request("http://localhost/api/admin/x"));
    expect(none).toBeInstanceOf(Response);
    expect((none as Response).status).toBe(401);
    const r = await login("owner@sukavillage.com", "kata-sandi-panjang");
    const ok = await requireAdmin(new Request("http://localhost/api/admin/x", { headers: { cookie: `other=1; ${ADMIN_COOKIE}=${r!.token}` } }));
    expect(ok).toMatchObject({ email: "owner@sukavillage.com" });
  });
});
