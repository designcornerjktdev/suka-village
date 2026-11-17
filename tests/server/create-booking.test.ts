import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { seedDatabase } from "@/lib/server/seed-db";
import { createBooking } from "@/lib/server/bookings";
import { claimNights } from "@/lib/server/nights";
import { jakartaToday } from "@/lib/server/time";
import { fromDay } from "@/lib/server/mappers";
import { quote } from "@/lib/booking/pricing";
import type { CreateInput } from "@/lib/booking/types";
import { resetDb } from "../setup";

/* 1 March 2027, 10:00 in Jakarta. Stays below are later that month. */
const NOW = new Date("2027-03-01T03:00:00Z");

const input = (over: Partial<CreateInput> = {}): CreateInput => ({
  checkIn: "2027-03-10",
  checkOut: "2027-03-12",
  units: ["mainVilla"],
  guests: 4,
  guest: { name: "Ana Wijaya", email: "ana@example.com", phone: "0812-3456-7890" },
  method: "qris",
  locale: "id",
  ...over,
});

const create = (over: Partial<CreateInput> = {}, now = NOW) => createBooking(input(over), { now });

beforeEach(async () => {
  await resetDb();
  await seedDatabase(db);
  await db.rate.updateMany({ data: { bookable: true } });
});

describe("createBooking", () => {
  it("creates pending booking with server price", async () => {
    const r = await create({ quote: { total: 1 } } as unknown as Partial<CreateInput>);
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    const rates = (await db.rate.findMany()).map((x) => ({ ...x, seasons: [], maxGuests: undefined }));
    expect(r.booking.quote.total).toBe(quote(rates, "2027-03-10", "2027-03-12", ["mainVilla"]).total);
    expect(r.booking.quote.total).toBeGreaterThan(1);
    expect(r.booking.status).toBe("pending");
    expect(r.booking.payment).toMatchObject({ status: "pending", amount: r.booking.quote.total, expiresAt: new Date(NOW.getTime() + 60 * 60_000).toISOString() });
    expect(r.booking.guest.phone).toBe("+6281234567890");
    expect(r.booking.code).toMatch(/^SV-[A-Z0-9]{6}$/);
    expect(await db.night.count({ where: { bookingCode: r.booking.code } })).toBe(2);
  });

  it("rejects overlapping nights", async () => {
    expect((await create()).ok).toBe(true);
    expect(await create({ checkIn: "2027-03-11", checkOut: "2027-03-13" })).toEqual({ ok: false, error: "unavailable", units: ["mainVilla"] });
  });

  it("names only the clashing rooms in a group booking", async () => {
    await create();
    const r = await create({ units: ["mainVilla", "familyCabin"] });
    expect(r).toEqual({ ok: false, error: "unavailable", units: ["mainVilla"] });
    expect(await db.night.count({ where: { unit: "familyCabin" } })).toBe(0);
  });

  it("checkout night is free", async () => {
    expect((await create()).ok).toBe(true);
    expect((await create({ checkIn: "2027-03-12", checkOut: "2027-03-14" })).ok).toBe(true);
  });

  it("concurrent create", async () => {
    const results = await Promise.all([create(), create(), create()]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok).every((r) => !r.ok && r.error === "unavailable")).toBe(true);
    expect(await db.booking.count()).toBe(1);
  });

  it("concurrent create under deadlock retry", async () => {
    /* Ten guests at once, overlapping rooms and nights: on MariaDB this is
       where lock waits and deadlocks show. Every answer is ok or unavailable,
       none throws, and no two accepted bookings share a night of a room. */
    const tries: Partial<CreateInput>[] = [];
    for (let i = 0; i < 10; i++) {
      const start = 10 + (i % 4);
      tries.push({ checkIn: `2027-03-${start}`, checkOut: `2027-03-${start + 2}`, units: i % 3 === 0 ? ["mainVilla", "familyCabin"] : i % 3 === 1 ? ["familyCabin"] : ["mainVilla"] });
    }
    const results = await Promise.all(tries.map((t) => create(t)));
    expect(results.every((r) => r.ok || r.error === "unavailable")).toBe(true);
    const won = results.filter((r) => r.ok);
    expect(won.length).toBeGreaterThan(0);
    const taken = new Set<string>();
    for (const r of won) {
      if (!r.ok) continue;
      for (const unit of r.booking.units) {
        for (const n of r.booking.quote.lines.find((l) => l.unit === unit)!.nights) {
          const key = `${unit}:${n.date}`;
          expect(taken.has(key)).toBe(false);
          taken.add(key);
        }
      }
    }
    expect(await db.night.count()).toBe(taken.size);
  });

  it("blocked dates are unavailable", async () => {
    const block = await db.block.create({ data: { unit: "mainVilla", from: fromDay("2027-03-11"), to: fromDay("2027-03-12"), reason: "airbnb" } });
    await db.$transaction((tx) => claimNights(tx, ["mainVilla"], ["2027-03-11"], { blockId: block.id }));
    expect(await create()).toEqual({ ok: false, error: "unavailable", units: ["mainVilla"] });
  });

  it("lapsed hold frees nights", async () => {
    const first = await create();
    if (!first.ok) throw new Error("setup");
    const later = new Date(NOW.getTime() + 61 * 60_000);
    const second = await create({}, later);
    expect(second.ok).toBe(true);
    const a = await db.booking.findUniqueOrThrow({ where: { code: first.booking.code }, include: { payment: true, events: true } });
    expect(a.status).toBe("expired");
    expect(a.payment?.status).toBe("expired");
    expect(a.events.map((e) => e.event)).toContain("Waktu pembayaran habis");
  });

  it("min_nights", async () => {
    await db.rate.update({ where: { unit: "mainVilla" }, data: { minNights: 3 } });
    expect(await create()).toEqual({ ok: false, error: "min_nights", units: ["mainVilla"] });
  });

  it("not_bookable", async () => {
    await db.rate.update({ where: { unit: "mainVilla" }, data: { bookable: false } });
    expect(await create()).toEqual({ ok: false, error: "not_bookable", units: ["mainVilla"] });
    expect(await create({ units: ["noSuchRoom"] })).toEqual({ ok: false, error: "not_bookable", units: ["noSuchRoom"] });
    await db.room.update({ where: { unit: "familyCabin" }, data: { archived: true } });
    expect(await create({ units: ["familyCabin"] })).toEqual({ ok: false, error: "not_bookable", units: ["familyCabin"] });
  });

  it("admin source bypasses bookable", async () => {
    await db.rate.update({ where: { unit: "mainVilla" }, data: { bookable: false, minNights: 5 } });
    const r = await create({ source: "admin", guest: { name: "Budi", email: "", phone: "081234567890" } });
    expect(r.ok).toBe(true);
  });

  it("admin paid creates confirmed", async () => {
    const r = await create({ source: "admin", paid: true });
    expect(r.ok && r.booking.status).toBe("confirmed");
    expect(r.ok && r.booking.payment.status).toBe("paid");
    expect(r.ok && r.booking.history[0]).toMatchObject({ by: "admin", event: "Pesanan dibuat oleh admin" });
  });

  it("invalid input", async () => {
    expect(await create({ guest: { name: "Ana", email: "bukan-email", phone: "0812345678" } })).toEqual({ ok: false, error: "invalid" });
    expect(await create({ guest: { name: "Ana", email: "", phone: "0812345678" } })).toEqual({ ok: false, error: "invalid" });
    expect(await create({ checkOut: "2027-03-10" })).toEqual({ ok: false, error: "invalid" });
    expect(await create({ units: [] })).toEqual({ ok: false, error: "invalid" });
  });

  describe("promo", () => {
    const promo = (over: Record<string, unknown> = {}) =>
      db.promo.create({ data: { code: "HEMAT10", kind: "percent", value: 10, minNights: 1, units: [], active: true, ...over } });

    it("applies the discount computed on the server", async () => {
      await promo();
      const r = await create({ promoCode: " hemat10 " });
      expect(r.ok).toBe(true);
      if (!r.ok) return;
      expect(r.booking.quote.discount).toBe(Math.floor((r.booking.quote.subtotal! * 10) / 100));
      expect(r.booking.quote.total).toBe(r.booking.quote.subtotal! - r.booking.quote.discount!);
      expect(r.booking.payment.amount).toBe(r.booking.quote.total);
      expect(r.booking.history.map((h) => h.event)).toContain(`Kode promo HEMAT10 dipakai, potongan Rp ${r.booking.quote.discount!.toLocaleString("id-ID")}`);
    });

    it("an unknown or expired code fails the booking", async () => {
      expect(await create({ promoCode: "TIDAKADA" })).toEqual({ ok: false, error: "promo", promoError: "not_found" });
      await promo({ validTo: fromDay("2027-02-28") });
      expect(await create({ promoCode: "HEMAT10" })).toEqual({ ok: false, error: "promo", promoError: "ended" });
    });

    it("promo quota race", async () => {
      await promo({ quota: 1 });
      const [a, b] = await Promise.all([
        create({ promoCode: "HEMAT10" }),
        create({ promoCode: "HEMAT10", units: ["familyCabin"] }),
      ]);
      const ok = [a, b].filter((r) => r.ok);
      expect(ok).toHaveLength(1);
      expect([a, b].filter((r) => !r.ok)).toEqual([{ ok: false, error: "promo", promoError: "used_up" }]);
    });

    it("a released booking gives its use back", async () => {
      await promo({ quota: 1 });
      const first = await create({ promoCode: "HEMAT10" });
      expect(first.ok).toBe(true);
      const later = new Date(NOW.getTime() + 61 * 60_000);
      expect((await create({ promoCode: "HEMAT10", units: ["familyCabin"] }, later)).ok).toBe(true);
    });
  });
});

describe("jakartaToday", () => {
  it("uses the Jakarta calendar day, not the server's", () => {
    expect(jakartaToday(new Date("2026-12-09T16:59:00Z"))).toBe("2026-12-09");
    expect(jakartaToday(new Date("2026-12-09T17:00:00Z"))).toBe("2026-12-10");
  });
});
