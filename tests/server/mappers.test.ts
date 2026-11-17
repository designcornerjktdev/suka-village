import { describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { bookingInclude, toBooking, toPromo, toRate, toRoom } from "@/lib/server/mappers";
import { resetDb } from "../setup";

describe("mappers", () => {
  it("toBooking round-trips dates", async () => {
    await resetDb();
    await db.room.create({ data: { unit: "mainVilla", name: "Main Villa", size: 150, bedrooms: 3, bathrooms: 2, features: [], description: { id: "", en: "" }, photos: [] } });
    const quote = { checkIn: "2026-12-31", checkOut: "2027-01-02", nights: 2, lines: [], total: 100, currency: "IDR" };
    await db.booking.create({
      data: {
        code: "SV-TEST01",
        status: "pending",
        source: "website",
        locale: "en",
        checkIn: new Date("2026-12-31"),
        checkOut: new Date("2027-01-02"),
        guests: 4,
        guestName: "Ana",
        guestEmail: "ana@example.com",
        guestPhone: "+6281234567890",
        quote,
        units: { create: [{ unit: "mainVilla" }] },
        payment: { create: { method: "qris", amount: 100, status: "pending", reference: "QR", expiresAt: new Date("2026-12-01T10:00:00Z") } },
        events: { create: [{ by: "guest", event: "Pesanan dibuat di website", at: new Date("2026-12-01T09:00:00Z") }] },
      },
    });
    const row = await db.booking.findUniqueOrThrow({ where: { code: "SV-TEST01" }, include: bookingInclude });
    const b = toBooking(row);
    expect(b.checkIn).toBe("2026-12-31");
    expect(b.checkOut).toBe("2027-01-02");
    expect(b.units).toEqual(["mainVilla"]);
    expect(b.guest).toEqual({ name: "Ana", email: "ana@example.com", phone: "+6281234567890" });
    expect(b.payment).toMatchObject({ method: "qris", amount: 100, status: "pending", expiresAt: "2026-12-01T10:00:00.000Z" });
    expect(b.history).toEqual([{ at: "2026-12-01T09:00:00.000Z", by: "guest", event: "Pesanan dibuat di website" }]);
    expect(b.notes).toBeUndefined();
    expect(b.quote).toEqual(quote);
  });

  it("toRate, toRoom, toPromo give the client shapes", async () => {
    await resetDb();
    const room = await db.room.create({ data: { unit: "singleCabin", name: "Single Cabin", size: 30, bedrooms: 1, bathrooms: 1, features: ["wifi"], description: { id: "a", en: "b" }, photos: ["/p.jpg"] } });
    expect(toRoom(room)).toEqual({ unit: "singleCabin", name: "Single Cabin", size: 30, bedrooms: 1, bathrooms: 1, features: ["wifi"], description: { id: "a", en: "b" }, photos: ["/p.jpg"] });
    const rate = await db.rate.create({ data: { unit: "singleCabin", weekday: 1, weekend: 2, minNights: 1, bookable: false, seasons: [] } });
    expect(toRate(rate)).toEqual({ unit: "singleCabin", weekday: 1, weekend: 2, minNights: 1, bookable: false, seasons: [] });
    const promo = await db.promo.create({ data: { code: "HEMAT", kind: "percent", value: 10, minNights: 1, units: [], active: true, validFrom: new Date("2026-12-01") } });
    expect(toPromo(promo)).toMatchObject({ code: "HEMAT", validFrom: "2026-12-01", units: [] });
    expect(toPromo(promo).validTo).toBeUndefined();
  });
});
