import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { seedDatabase } from "@/lib/server/seed-db";
import {
  cancel,
  checkIn,
  checkOut,
  confirm,
  createBooking,
  markPaidByGateway,
  markPaidManually,
  reject,
  saveInternalNote,
  softDelete,
  updateGuest,
} from "@/lib/server/bookings";
import type { CreateInput } from "@/lib/booking/types";
import { resetDb } from "../setup";

const NOW = new Date("2027-03-01T03:00:00Z");
const ADMIN = "admin-1";

const input = (over: Partial<CreateInput> = {}): CreateInput => ({
  checkIn: "2027-03-10",
  checkOut: "2027-03-12",
  units: ["mainVilla"],
  guests: 4,
  guest: { name: "Ana Wijaya", email: "ana@example.com", phone: "081234567890" },
  method: "va_bca",
  locale: "id",
  ...over,
});

async function pending(over: Partial<CreateInput> = {}) {
  const r = await createBooking(input(over), { now: NOW });
  if (!r.ok) throw new Error(`setup: ${r.error}`);
  return r.booking.code;
}
async function paid() {
  const code = await pending();
  const r = await markPaidByGateway(code, "doku-1", NOW);
  if (!r.ok) throw new Error("setup paid");
  return code;
}
async function confirmed() {
  const code = await paid();
  await confirm(code, ADMIN);
  return code;
}
/** The nights are free again: another booking for them succeeds. */
const nightsFree = async () => (await createBooking(input(), { now: NOW })).ok;

beforeEach(async () => {
  await resetDb();
  await seedDatabase(db);
  await db.rate.updateMany({ data: { bookable: true } });
});

describe("markPaidByGateway", () => {
  it("pending → paid, waiting for the admin", async () => {
    const code = await pending();
    const r = await markPaidByGateway(code, "doku-1", NOW);
    expect(r.ok && r.booking.status).toBe("paid");
    expect(r.ok && r.booking.payment).toMatchObject({ status: "paid", gatewayId: "doku-1", paidAt: NOW.toISOString() });
    expect(r.ok && r.templates).toEqual(["payment_received"]);
    expect(r.ok && r.booking.history.at(-1)).toMatchObject({ by: "gateway", event: "Pembayaran diterima, menunggu konfirmasi admin" });
  });

  it("twice changes the status once and asks for no second email", async () => {
    const code = await pending();
    await markPaidByGateway(code, "doku-1", NOW);
    const again = await markPaidByGateway(code, "doku-1", NOW);
    expect(again.ok && again.templates).toEqual([]);
    expect(again.ok && again.booking.history.filter((h) => h.by === "gateway")).toHaveLength(1);
  });

  it("refuses a booking that is no longer pending (expired, cancelled)", async () => {
    const code = await pending();
    await cancel(code, "guest");
    expect(await markPaidByGateway(code, "doku-1", NOW)).toEqual({ ok: false, error: "state" });
  });
});

describe("admin decision", () => {
  it("confirm only from paid", async () => {
    expect(await confirm(await pending({ units: ["singleCabin"] }), ADMIN)).toEqual({ ok: false, error: "state" });
    const r = await confirm(await paid(), ADMIN);
    expect(r.ok && r.booking.status).toBe("confirmed");
    expect(r.ok && r.templates).toEqual(["confirmed"]);
    expect(r.ok && r.booking.history.at(-1)).toMatchObject({ by: "admin", event: "Pesanan diterima admin" });
  });

  it("two admins confirming at once: one succeeds, one email", async () => {
    const code = await paid();
    const results = await Promise.all([confirm(code, ADMIN), confirm(code, "admin-2")]);
    expect(results.filter((r) => r.ok)).toHaveLength(1);
  });

  it("reject only from paid, releases nights, flags the refund", async () => {
    const code = await paid();
    const r = await reject(code, " Kamar sedang diperbaiki ", ADMIN);
    expect(r.ok && r.booking.status).toBe("rejected");
    expect(r.ok && r.booking.rejectReason).toBe("Kamar sedang diperbaiki");
    expect(r.ok && r.templates).toEqual(["rejected"]);
    expect(r.ok && r.booking.history.at(-1)?.event).toBe("Pesanan ditolak admin: Kamar sedang diperbaiki");
    expect((await db.booking.findUniqueOrThrow({ where: { code } })).refundOwed).toBe(true);
    expect(await nightsFree()).toBe(true);
    expect(await reject(code, "lagi", ADMIN)).toEqual({ ok: false, error: "state" });
  });
});

describe("cancel", () => {
  it("guest cancels while pending: nights released, payment expired", async () => {
    const code = await pending();
    const r = await cancel(code, "guest");
    expect(r.ok && r.booking.status).toBe("cancelled");
    expect(r.ok && r.booking.payment.status).toBe("expired");
    expect(r.ok && r.templates).toEqual(["cancelled"]);
    expect(r.ok && r.booking.history.at(-1)?.event).toBe("Dibatalkan oleh tamu");
    expect(await nightsFree()).toBe(true);
  });

  it("guest cannot cancel after paying", async () => {
    expect(await cancel(await paid(), "guest")).toEqual({ ok: false, error: "state" });
  });

  it("admin cancels a confirmed stay: released, refund flagged, reason kept", async () => {
    const code = await confirmed();
    const r = await cancel(code, "admin", "Tamu minta batal", ADMIN);
    expect(r.ok && r.booking.status).toBe("cancelled");
    expect(r.ok && r.booking.payment.status).toBe("paid");
    expect(r.ok && r.booking.history.at(-1)?.event).toBe("Dibatalkan: Tamu minta batal");
    expect((await db.booking.findUniqueOrThrow({ where: { code } })).refundOwed).toBe(true);
    expect(await nightsFree()).toBe(true);
  });

  it("admin cannot cancel a stay already checked in", async () => {
    const code = await confirmed();
    await checkIn(code, ADMIN, "2027-03-10");
    expect(await cancel(code, "admin", undefined, ADMIN)).toEqual({ ok: false, error: "state" });
  });
});

describe("stay", () => {
  it("check-in only from confirmed and from the arrival day", async () => {
    const code = await confirmed();
    expect(await checkIn(code, ADMIN, "2027-03-09")).toEqual({ ok: false, error: "state" });
    const r = await checkIn(code, ADMIN, "2027-03-10");
    expect(r.ok && r.booking.status).toBe("checked_in");
    expect(r.ok && r.templates).toEqual([]);
    expect(r.ok && r.booking.history.at(-1)?.event).toBe("Tamu check-in");
  });

  it("check-out only from checked_in, nights stay taken", async () => {
    const code = await confirmed();
    expect(await checkOut(code, ADMIN)).toEqual({ ok: false, error: "state" });
    await checkIn(code, ADMIN, "2027-03-10");
    const r = await checkOut(code, ADMIN);
    expect(r.ok && r.booking.status).toBe("completed");
    expect(await nightsFree()).toBe(false);
  });
});

describe("markPaidManually", () => {
  it("pending → confirmed with method manual", async () => {
    const code = await pending();
    const r = await markPaidManually(code, "Transfer BCA 1 Mar", ADMIN);
    expect(r.ok && r.booking.status).toBe("confirmed");
    expect(r.ok && r.booking.payment).toMatchObject({ method: "manual", status: "paid", reference: "Transfer BCA 1 Mar" });
    expect(r.ok && r.templates).toEqual(["confirmed"]);
    expect(r.ok && r.booking.history.at(-1)?.event).toBe("Dibayar di luar gateway dan dikonfirmasi: Transfer BCA 1 Mar");
  });

  it("refused once the hold has lapsed", async () => {
    const code = await pending();
    expect(await markPaidManually(code, "", ADMIN, new Date(NOW.getTime() + 61 * 60_000))).toEqual({ ok: false, error: "state" });
  });
});

describe("edits", () => {
  it("updateGuest corrects the guest, validates, and logs", async () => {
    const code = await pending();
    expect(await updateGuest(code, { guest: { name: "", email: "", phone: "0812345678" }, guests: 2 }, ADMIN)).toEqual({ ok: false, error: "invalid" });
    const r = await updateGuest(code, { guest: { name: "Ana W.", email: "", phone: "0812-9999-0000" }, guests: 6, notes: " datang malam " }, ADMIN);
    expect(r.ok && r.booking.guest).toEqual({ name: "Ana W.", email: "", phone: "+6281299990000" });
    expect(r.ok && r.booking.guests).toBe(6);
    expect(r.ok && r.booking.notes).toBe("datang malam");
    expect(r.ok && r.booking.history.at(-1)?.event).toBe("Data tamu diubah admin");
  });

  it("saveInternalNote", async () => {
    const code = await pending();
    const r = await saveInternalNote(code, "VIP");
    expect(r.ok && r.booking.internalNote).toBe("VIP");
  });

  it("softDelete only cancelled, expired, rejected", async () => {
    const live = await pending();
    expect(await softDelete(live)).toEqual({ ok: false, error: "state" });
    const gone = await pending({ units: ["singleCabin"] });
    await cancel(gone, "guest");
    expect(await softDelete(gone)).toEqual({ ok: true });
    expect((await db.booking.findUniqueOrThrow({ where: { code: gone } })).deletedAt).not.toBeNull();
  });

  it("unknown code", async () => {
    expect(await confirm("SV-NOPE00", ADMIN)).toEqual({ ok: false, error: "not_found" });
  });

  it("admin writes record the admin id", async () => {
    const code = await paid();
    await confirm(code, ADMIN);
    const ev = await db.bookingEvent.findFirstOrThrow({ where: { bookingCode: code, event: "Pesanan diterima admin" } });
    expect(ev.adminId).toBe(ADMIN);
  });
});
