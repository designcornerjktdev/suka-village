import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { seedDatabase } from "@/lib/server/seed-db";
import { createBooking, findBooking, reject, markPaidByGateway, saveInternalNote } from "@/lib/server/bookings";
import { createPromo } from "@/lib/server/catalog";
import type { CreateInput } from "@/lib/booking/types";
import { resetDb } from "../setup";

/**
 * What MariaDB (Hostinger) does differently from Postgres and the code must
 * survive: VARCHAR(191) for plain strings, case-insensitive collations.
 */

const input = (over: Partial<CreateInput> = {}): CreateInput => ({
  checkIn: "2027-03-10",
  checkOut: "2027-03-12",
  units: ["mainVilla"],
  guests: 4,
  guest: { name: "Ana Wijaya", email: "ana@example.com", phone: "081234567890" },
  method: "dana",
  locale: "id",
  ...over,
});

beforeEach(async () => {
  await resetDb();
  await seedDatabase(db);
  await db.rate.updateMany({ data: { bookable: true } });
});

describe("long values survive", () => {
  it("a DOKU payment URL, a 5000 character note, a long reject reason and history line", async () => {
    const r = await createBooking(input({ notes: "n".repeat(2000) }));
    if (!r.ok) throw new Error(r.error);
    const code = r.booking.code;
    /* DOKU's e-wallet URLs in the sandbox were ~900 characters; allow far more. */
    const url = `https://sandbox.doku.com/direct-debit-simulator-ui/dana/activation?token=${"x".repeat(2000)}`;
    await db.payment.update({ where: { bookingCode: code }, data: { reference: url } });
    await saveInternalNote(code, "i".repeat(5000));
    await markPaidByGateway(code, "g", new Date());
    const reason = "r".repeat(1000);
    await reject(code, reason, "admin-1");
    const b = await findBooking(code);
    expect(b?.payment.reference).toBe(url);
    expect(b?.notes).toHaveLength(2000);
    expect(b?.internalNote).toHaveLength(5000);
    expect(b?.rejectReason).toBe(reason);
    expect(b?.history.at(-1)?.event).toBe(`Pesanan ditolak admin: ${reason}`);
  });
});

describe("codes are found in any case", () => {
  it("a booking code typed in lower case finds the booking", async () => {
    const r = await createBooking(input());
    if (!r.ok) throw new Error(r.error);
    expect((await findBooking(r.booking.code.toLowerCase()))?.code).toBe(r.booking.code);
  });

  it("a promo code exists once, whatever the case it is typed in", async () => {
    const p = { kind: "percent" as const, value: 10, minNights: 1, units: [], active: true };
    expect(await createPromo({ ...p, code: "HEMAT" })).toMatchObject({ ok: true });
    expect(await createPromo({ ...p, code: "hemat" })).toEqual({ ok: false, error: "duplicate" });
  });
});
