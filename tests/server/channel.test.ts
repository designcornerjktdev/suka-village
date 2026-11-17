import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { seedDatabase } from "@/lib/server/seed-db";
import { cancel, confirm, createBooking, markPaidByGateway, reject } from "@/lib/server/bookings";
import { createBlock, deleteBlock } from "@/lib/server/blocks";
import { setChannel, type ChannelEvent } from "@/lib/server/channel";
import { runExpire } from "@/lib/server/jobs";
import type { CreateInput } from "@/lib/booking/types";
import { resetDb } from "../setup";

const input = (over: Partial<CreateInput> = {}): CreateInput => ({
  checkIn: "2027-03-10",
  checkOut: "2027-03-12",
  units: ["mainVilla"],
  guests: 4,
  guest: { name: "Ana Wijaya", email: "ana@example.com", phone: "081234567890" },
  method: "va_bni",
  locale: "id",
  ...over,
});

let events: ChannelEvent[] = [];

beforeEach(async () => {
  await resetDb();
  await seedDatabase(db);
  await db.rate.updateMany({ data: { bookable: true } });
  events = [];
  setChannel({ push: async (e) => void events.push(e) });
});
afterEach(() => setChannel(null));

describe("channel seam (BookandLink later)", () => {
  it("tells the channel when nights are taken and when they are given back", async () => {
    const r = await createBooking(input());
    if (!r.ok) throw new Error();
    await markPaidByGateway(r.booking.code, "g", new Date());
    await confirm(r.booking.code, "admin-1");
    await cancel(r.booking.code, "admin", "Tamu batal", "admin-1");
    expect(events).toEqual([
      { kind: "booking", code: r.booking.code, holds: true },
      { kind: "booking", code: r.booking.code, holds: false },
    ]);
  });

  it("a rejected booking gives its nights back too", async () => {
    const r = await createBooking(input());
    if (!r.ok) throw new Error();
    await markPaidByGateway(r.booking.code, "g", new Date());
    events = [];
    await reject(r.booking.code, "Penuh", "admin-1");
    expect(events).toEqual([{ kind: "booking", code: r.booking.code, holds: false }]);
  });

  it("a hold that ran out gives its nights back (reported by the expire job)", async () => {
    const r = await createBooking(input(), { now: new Date("2026-12-01T03:00:00Z") });
    if (!r.ok) throw new Error();
    events = [];
    await runExpire(new Date("2026-12-01T05:00:00Z"));
    expect(events).toEqual([{ kind: "booking", code: r.booking.code, holds: false }]);
  });

  it("dates closed and opened by hand", async () => {
    const b = await createBlock({ unit: "familyCabin", from: "2027-04-01", to: "2027-04-03", reason: "maintenance" });
    if (!b.ok) throw new Error();
    await deleteBlock(b.block.id);
    expect(events).toEqual([
      { kind: "block", id: b.block.id, holds: true },
      { kind: "block", id: b.block.id, holds: false },
    ]);
  });

  it("a channel that fails never undoes the booking", async () => {
    setChannel({ push: async () => { throw new Error("BookandLink down"); } });
    const r = await createBooking(input());
    expect(r.ok).toBe(true);
  });

  it("with no channel set up (launch), nothing happens", async () => {
    setChannel(null);
    expect((await createBooking(input())).ok).toBe(true);
  });
});
