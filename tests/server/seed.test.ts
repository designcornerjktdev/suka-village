import { describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { seedDatabase } from "@/lib/server/seed-db";
import { resetDb } from "../setup";

describe("seedDatabase", () => {
  it("imports rooms, content and settings, off sale, with no demo bookings or promos", async () => {
    await resetDb();
    await seedDatabase(db);
    const rooms = await db.room.findMany({ orderBy: { position: "asc" }, include: { rate: true } });
    expect(rooms.map((r) => r.unit)).toEqual(["mainVilla", "familyCabin", "singleCabin"]);
    expect(rooms.every((r) => r.rate && !r.rate.bookable)).toBe(true);
    expect(await db.booking.count()).toBe(0);
    expect(await db.promo.count()).toBe(0);
    expect(await db.contentItem.count({ where: { section: "facilities" } })).toBeGreaterThan(0);
    const settings = await db.settings.findUniqueOrThrow({ where: { id: 1 } });
    expect((settings.data as { holdMinutes: number }).holdMinutes).toBe(60);
  });

  it("starts with OVO, GoPay and ShopeePay switched off (not working through DOKU yet)", async () => {
    await resetDb();
    await seedDatabase(db);
    const { methods } = (await db.settings.findUniqueOrThrow({ where: { id: 1 } })).data as { methods: Record<string, boolean> };
    expect(methods.ovo).toBe(false);
    expect(methods.gopay).toBe(false);
    expect(methods.shopeepay).toBe(false);
    expect(methods.dana && methods.qris && methods.va_bni).toBe(true);
  });

  it("is safe to run twice and never overwrites the owner's edits", async () => {
    await resetDb();
    await seedDatabase(db);
    await db.room.update({ where: { unit: "mainVilla" }, data: { name: "Edited by owner" } });
    await seedDatabase(db);
    expect(await db.room.count()).toBe(3);
    expect((await db.room.findUniqueOrThrow({ where: { unit: "mainVilla" } })).name).toBe("Edited by owner");
  });
});
