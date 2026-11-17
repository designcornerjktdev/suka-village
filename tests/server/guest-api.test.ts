import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { seedDatabase } from "@/lib/server/seed-db";
import { issueAccessToken, verifyAccess } from "@/lib/server/access";
import { rateLimit } from "@/lib/server/ratelimit";
import { markPaidByGateway, saveInternalNote } from "@/lib/server/bookings";
import { GET as rooms } from "@/app/api/rooms/route";
import { GET as availability } from "@/app/api/availability/route";
import { POST as checkPromo } from "@/app/api/promos/check/route";
import { GET as getPromo } from "@/app/api/promos/[code]/route";
import { POST as createBooking } from "@/app/api/bookings/route";
import { GET as getBooking } from "@/app/api/bookings/[code]/route";
import { POST as lookup } from "@/app/api/bookings/lookup/route";
import { POST as cancel } from "@/app/api/bookings/[code]/cancel/route";
import { resetDb } from "../setup";

let ip = 0;
/* Each test gets its own client address, so rate limits do not leak between tests. */
const req = (path: string, body?: unknown, from = `10.0.0.${++ip}`) =>
  new Request(`http://localhost${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { "content-type": "application/json", "x-forwarded-for": from },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
const ctx = <T extends Record<string, string>>(params: T) => ({ params: Promise.resolve(params) });

const booking = (over: Record<string, unknown> = {}) => ({
  checkIn: "2027-03-10",
  checkOut: "2027-03-12",
  units: ["mainVilla"],
  guests: 4,
  guest: { name: "Ana Wijaya", email: "Ana@Example.com", phone: "081234567890" },
  method: "qris",
  locale: "id",
  ...over,
});

async function book(over: Record<string, unknown> = {}) {
  const res = await createBooking(req("/api/bookings", booking(over)));
  const body = await res.json();
  if (!body.ok) throw new Error(`setup: ${body.error}`);
  return body as { ok: true; booking: { code: string }; token: string };
}

beforeEach(async () => {
  await resetDb();
  await seedDatabase(db);
  await db.rate.updateMany({ data: { bookable: true } });
});

describe("access tokens", () => {
  it("a token opens only its own booking", async () => {
    const a = await book();
    const b = await book({ units: ["singleCabin"] });
    expect(await verifyAccess(a.booking.code, a.token)).toBe(true);
    expect(await verifyAccess(b.booking.code, a.token)).toBe(false);
    expect(await verifyAccess(a.booking.code, "")).toBe(false);
    const again = await issueAccessToken(a.booking.code);
    expect(again).not.toBe(a.token);
    expect(await verifyAccess(a.booking.code, a.token)).toBe(true);
  });
});

describe("rateLimit", () => {
  it("allows `limit` hits per minute per key", async () => {
    const now = new Date("2027-03-01T03:00:10Z");
    for (let i = 0; i < 3; i++) expect(await rateLimit("k", 3, now)).toBe(true);
    expect(await rateLimit("k", 3, now)).toBe(false);
    expect(await rateLimit("other", 3, now)).toBe(true);
    expect(await rateLimit("k", 3, new Date("2027-03-01T03:01:00Z"))).toBe(true);
  });
});

describe("GET /api/rooms", () => {
  it("rooms on sale and their public rates, archived rooms left out", async () => {
    await db.room.update({ where: { unit: "singleCabin" }, data: { archived: true } });
    const body = await (await rooms()).json();
    expect(body.rooms.map((r: { unit: string }) => r.unit)).toEqual(["mainVilla", "familyCabin"]);
    expect(body.rates.map((r: { unit: string }) => r.unit).sort()).toEqual(["familyCabin", "mainVilla"]);
  });
});

describe("GET /api/availability", () => {
  it("returns taken dates per room, no booking codes, lapsed holds left out", async () => {
    const a = await book();
    await db.payment.update({ where: { bookingCode: a.booking.code }, data: { expiresAt: new Date(Date.now() - 1000) } });
    await book({ units: ["familyCabin"] });
    const body = await (await availability(req("/api/availability?from=2027-03-01&to=2027-04-01"))).json();
    expect(body).toEqual({ occupancy: { familyCabin: ["2027-03-10", "2027-03-11"] } });
    expect(JSON.stringify(body)).not.toContain("SV-");
  });
});

describe("promos", () => {
  beforeEach(async () => {
    await db.promo.create({ data: { code: "HEMAT10", kind: "percent", value: 10, minNights: 1, units: [], active: true, quota: 50, note: "rahasia admin" } });
  });

  it("check answers with the discounted quote and hides the admin note", async () => {
    const res = await checkPromo(req("/api/promos/check", { code: "hemat10", checkIn: "2027-03-10", checkOut: "2027-03-12", units: ["mainVilla"] }));
    const body = await res.json();
    expect(body.ok).toBe(true);
    expect(body.quote.discount).toBeGreaterThan(0);
    expect(body.promo.code).toBe("HEMAT10");
    expect(body.promo.note).toBeUndefined();
  });

  it("check: unknown code", async () => {
    const body = await (await checkPromo(req("/api/promos/check", { code: "NOPE", checkIn: "2027-03-10", checkOut: "2027-03-12", units: ["mainVilla"] }))).json();
    expect(body).toEqual({ ok: false, error: "not_found" });
  });

  it("check is rate limited (codes can be guessed)", async () => {
    const from = "10.9.9.9";
    const statuses = [];
    for (let i = 0; i < 11; i++) statuses.push((await checkPromo(req("/api/promos/check", { code: `X${i}`, checkIn: "2027-03-10", checkOut: "2027-03-12", units: ["mainVilla"] }, from))).status);
    expect(statuses.slice(0, 10).every((s) => s === 200)).toBe(true);
    expect(statuses[10]).toBe(429);
  });

  it("GET /api/promos/:code answers one code only, without the note", async () => {
    const body = await (await getPromo(req("/api/promos/hemat10"), ctx({ code: "hemat10" }))).json();
    expect(body.code).toBe("HEMAT10");
    expect(body.note).toBeUndefined();
    expect((await getPromo(req("/api/promos/NOPE"), ctx({ code: "NOPE" }))).status).toBe(404);
  });
});

describe("POST /api/bookings", () => {
  it("creates a website booking and returns an access token", async () => {
    const r = await book();
    expect(r.booking.code).toMatch(/^SV-/);
    expect(await verifyAccess(r.booking.code, r.token)).toBe(true);
  });

  it("ignores source and paid sent by a guest", async () => {
    const res = await createBooking(req("/api/bookings", booking({ source: "admin", paid: true })));
    const body = await res.json();
    expect(body.booking.status).toBe("pending");
    expect(body.booking.source).toBe("website");
  });

  it("malformed body → 400 invalid", async () => {
    const res = await createBooking(req("/api/bookings", { units: "mainVilla" }));
    expect(res.status).toBe(400);
    expect(await res.json()).toEqual({ ok: false, error: "invalid" });
  });

  it("the 6th booking from one address in a minute → 429", async () => {
    const from = "10.8.8.8";
    const statuses = [];
    for (let i = 0; i < 6; i++) statuses.push((await createBooking(req("/api/bookings", booking({ checkIn: `2027-04-${10 + 2 * i}`, checkOut: `2027-04-${11 + 2 * i}` }), from))).status);
    expect(statuses.slice(0, 5)).toEqual([200, 200, 200, 200, 200]);
    expect(statuses[5]).toBe(429);
  });
});

describe("GET /api/bookings/:code", () => {
  it("with the token: the booking, without the internal note", async () => {
    const r = await book();
    await saveInternalNote(r.booking.code, "tamu rewel");
    const res = await getBooking(req(`/api/bookings/${r.booking.code}?t=${r.token}`), ctx({ code: r.booking.code }));
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.code).toBe(r.booking.code);
    expect(body.internalNote).toBeUndefined();
  });

  it("wrong token and unknown code answer exactly the same", async () => {
    const r = await book();
    const wrong = await getBooking(req(`/api/bookings/${r.booking.code}?t=salah`), ctx({ code: r.booking.code }));
    const none = await getBooking(req(`/api/bookings/SV-ZZZZZZ?t=${r.token}`), ctx({ code: "SV-ZZZZZZ" }));
    expect(wrong.status).toBe(404);
    expect(none.status).toBe(404);
    expect(await wrong.text()).toBe(await none.text());
  });
});

describe("POST /api/bookings/lookup", () => {
  it("code + email (any case) → booking and a fresh token", async () => {
    const r = await book();
    const body = await (await lookup(req("/api/bookings/lookup", { code: r.booking.code.toLowerCase(), email: " ana@EXAMPLE.com " }))).json();
    expect(body.booking.code).toBe(r.booking.code);
    expect(await verifyAccess(r.booking.code, body.token)).toBe(true);
  });

  it("wrong email and unknown code answer the same", async () => {
    const r = await book();
    const a = await lookup(req("/api/bookings/lookup", { code: r.booking.code, email: "x@example.com" }));
    const b = await lookup(req("/api/bookings/lookup", { code: "SV-ZZZZZZ", email: "ana@example.com" }));
    expect([a.status, b.status]).toEqual([404, 404]);
    expect(await a.text()).toBe(await b.text());
  });
});

describe("POST /api/bookings/:code/cancel", () => {
  it("guest cancels while pending", async () => {
    const r = await book();
    const res = await cancel(req(`/api/bookings/${r.booking.code}/cancel?t=${r.token}`, {}), ctx({ code: r.booking.code }));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("cancelled");
  });

  it("guest cancel emails `cancelled`", async () => {
    const r = await book();
    await cancel(req(`/api/bookings/${r.booking.code}/cancel?t=${r.token}`, {}), ctx({ code: r.booking.code }));
    expect(await db.notification.findMany({ where: { bookingCode: r.booking.code }, select: { template: true } })).toEqual([{ template: "cancelled" }]);
  });

  it("guest cancel after paid → 409", async () => {
    const r = await book();
    await markPaidByGateway(r.booking.code, "g", new Date());
    const res = await cancel(req(`/api/bookings/${r.booking.code}/cancel?t=${r.token}`, {}), ctx({ code: r.booking.code }));
    expect(res.status).toBe(409);
  });

  it("without the token → 404", async () => {
    const r = await book();
    expect((await cancel(req(`/api/bookings/${r.booking.code}/cancel`, {}), ctx({ code: r.booking.code }))).status).toBe(404);
  });
});
