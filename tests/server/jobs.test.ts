import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { seedDatabase } from "@/lib/server/seed-db";
import { confirm, createBooking, markPaidByGateway } from "@/lib/server/bookings";
import { runExpire, runReminders } from "@/lib/server/jobs";
import * as expireRoute from "@/app/api/cron/expire/route";
import * as reminderRoute from "@/app/api/cron/reminder/route";
import type { CreateInput } from "@/lib/booking/types";
import { resetDb } from "../setup";

const input = (over: Partial<CreateInput> = {}): CreateInput => ({
  checkIn: "2026-12-11",
  checkOut: "2026-12-13",
  units: ["mainVilla"],
  guests: 4,
  guest: { name: "Ana Wijaya", email: "ana@example.com", phone: "081234567890" },
  method: "va_bni",
  locale: "id",
  ...over,
});

async function book(over: Partial<CreateInput> = {}, now = new Date("2026-12-01T03:00:00Z")) {
  const r = await createBooking(input(over), { now });
  if (!r.ok) throw new Error(r.error);
  return r.booking.code;
}
async function confirmed(over: Partial<CreateInput> = {}) {
  const code = await book(over);
  await markPaidByGateway(code, "g", new Date("2026-12-01T03:05:00Z"));
  await confirm(code, "admin-1");
  return code;
}
const templates = async (code: string) => (await db.notification.findMany({ where: { bookingCode: code }, orderBy: { at: "asc" } })).map((n) => n.template);

beforeEach(async () => {
  await resetDb();
  await seedDatabase(db);
  await db.rate.updateMany({ data: { bookable: true } });
  process.env.CRON_SECRET = "cron-secret-for-tests";
});
afterEach(() => {
  delete process.env.CRON_SECRET;
});

describe("runExpire", () => {
  it("expires lapsed holds, frees their nights, emails `expired` once", async () => {
    const code = await book();
    const later = new Date("2026-12-01T05:00:00Z");
    expect(await runExpire(later)).toBe(1);
    expect((await db.booking.findUniqueOrThrow({ where: { code } })).status).toBe("expired");
    expect(await db.night.count({ where: { bookingCode: code } })).toBe(0);
    expect(await runExpire(later)).toBe(0);
    expect(await templates(code)).toEqual(["expired"]);
  });

  it("leaves holds still inside their window alone", async () => {
    await book();
    expect(await runExpire(new Date("2026-12-01T03:30:00Z"))).toBe(0);
  });

  it("a hold already expired by a booking transaction still gets its email", async () => {
    const code = await book();
    /* Another guest's booking expires it first (expireLapsed inside createBooking). */
    await book({ units: ["singleCabin"] }, new Date("2026-12-01T05:00:00Z"));
    expect((await db.booking.findUniqueOrThrow({ where: { code } })).status).toBe("expired");
    expect(await runExpire(new Date("2026-12-01T05:01:00Z"))).toBe(1);
    expect(await templates(code)).toEqual(["expired"]);
  });
});

describe("runReminders", () => {
  it("emails confirmed stays that start tomorrow in Jakarta, once", async () => {
    const tomorrow = await confirmed({ checkIn: "2026-12-11", checkOut: "2026-12-13" });
    const later = await confirmed({ checkIn: "2026-12-12", checkOut: "2026-12-14", units: ["familyCabin"] });
    const pending = await book({ checkIn: "2026-12-11", checkOut: "2026-12-12", units: ["singleCabin"] });
    /* 18:00 UTC on 9 Dec is 01:00 on 10 Dec in Jakarta: tomorrow is the 11th. */
    const now = new Date("2026-12-09T18:00:00Z");
    expect(await runReminders(now)).toBe(1);
    expect(await runReminders(now)).toBe(0);
    expect((await templates(tomorrow)).filter((t) => t === "reminder")).toHaveLength(1);
    expect(await templates(later)).not.toContain("reminder");
    expect(await templates(pending)).not.toContain("reminder");
  });

  it("uses the Jakarta day, not the server's (UTC) day", async () => {
    const code = await confirmed({ checkIn: "2026-12-11", checkOut: "2026-12-13" });
    /* 16:00 UTC on 9 Dec is 23:00 on 9 Dec in Jakarta: tomorrow is the 10th. */
    expect(await runReminders(new Date("2026-12-09T16:00:00Z"))).toBe(0);
    expect(await templates(code)).not.toContain("reminder");
  });
});

describe("cron routes", () => {
  const hit = (h: unknown, method: "GET" | "POST", auth?: string) =>
    (h as (r: Request) => Promise<Response>)(new Request("http://localhost/api/cron/x", { method, headers: auth ? { authorization: auth } : {} }));

  it("need Authorization: Bearer CRON_SECRET (GET for Vercel Cron, POST for curl)", async () => {
    expect((await hit(expireRoute.GET, "GET")).status).toBe(401);
    expect((await hit(expireRoute.POST, "POST", "Bearer salah")).status).toBe(401);
    const ok = await hit(expireRoute.GET, "GET", "Bearer cron-secret-for-tests");
    expect(ok.status).toBe(200);
    expect(await ok.json()).toEqual({ processed: 0 });
    expect((await hit(reminderRoute.POST, "POST", "Bearer cron-secret-for-tests")).status).toBe(200);
  });

  it("refuse everything when CRON_SECRET is not set", async () => {
    delete process.env.CRON_SECRET;
    expect((await hit(expireRoute.GET, "GET", "Bearer ")).status).toBe(401);
    expect((await hit(reminderRoute.GET, "GET", "Bearer undefined")).status).toBe(401);
  });
});
