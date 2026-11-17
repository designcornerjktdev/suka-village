import type { Prisma } from "@prisma/client";
import type { Booking, BookingStatus, CreateInput, CreateResult, Guest, HistoryEvent, Settings, TemplateId, UnitId } from "@/lib/booking/types";
import { bookingCode, isValidEmail, nightsOf, normalizePhone } from "@/lib/booking/format";
import { quote } from "@/lib/booking/pricing";
import { applyPromo } from "@/lib/booking/promo";
import { db } from "./db";
import { isUniqueViolation } from "./errors";
import { bookingInclude, fromDay, toBooking, toDay, toRate } from "./mappers";
import { claimNights, releaseNights, takenUnits } from "./nights";
import { findUsablePromo } from "./promos";
import { jakartaToday } from "./time";
import type { Tx } from "./tx";

/**
 * Bookings on the server: the authority for price, discount and
 * availability (BOOKING.md §2). Whatever the browser showed is recomputed here.
 */

export async function readSettings(tx: Tx | typeof db = db): Promise<Settings> {
  const row = await tx.settings.findUniqueOrThrow({ where: { id: 1 } });
  return row.data as unknown as Settings;
}

/**
 * Pending bookings whose payment window has passed become expired and give
 * their nights (and any promo use) back. Runs at the start of every booking
 * transaction and from the cron job, so a late cron never keeps a night
 * locked. Returns the codes it expired, for the `expired` email.
 */
export async function expireLapsed(tx: Tx, now: Date): Promise<string[]> {
  const lapsed = await tx.booking.findMany({
    where: { status: "pending", payment: { expiresAt: { lte: now } } },
    select: { code: true },
  });
  for (const { code } of lapsed) {
    await tx.booking.update({ where: { code }, data: { status: "expired" } });
    await tx.payment.update({ where: { bookingCode: code }, data: { status: "expired" } });
    await releaseNights(tx, { bookingCode: code });
    await tx.bookingEvent.create({ data: { bookingCode: code, by: "system", event: "Waktu pembayaran habis", at: now } });
  }
  return lapsed.map((b) => b.code);
}

class Refused extends Error {
  constructor(readonly result: Extract<CreateResult, { ok: false }>) {
    super(result.error);
  }
}

async function freeCode(tx: Tx) {
  for (;;) {
    const code = bookingCode();
    if (!(await tx.booking.findUnique({ where: { code }, select: { code: true } }))) return code;
  }
}

/**
 * POST /api/bookings (and the admin's booking manual, source "admin").
 *
 * Does not open the payment charge: that happens after the transaction
 * commits (lib/server/payments), so a slow gateway never holds a lock.
 */
export async function createBooking(input: CreateInput, opts: { now?: Date } = {}): Promise<CreateResult> {
  const now = opts.now ?? new Date();
  const admin = input.source === "admin";

  const phone = normalizePhone(input.guest.phone);
  const email = input.guest.email.trim();
  /* A guest on the website must give an email. A booking the admin takes over
     WhatsApp may not have one; the WhatsApp number is enough. */
  const emailOk = isValidEmail(email) || (admin && !email);
  if (!input.units.length || !(input.checkOut > input.checkIn) || !input.guest.name.trim() || !emailOk || !phone || !(input.guests >= 1)) {
    return { ok: false, error: "invalid" };
  }
  const units = [...new Set(input.units)];
  const nights = nightsOf(input.checkIn, input.checkOut);

  try {
    return await db.$transaction(async (tx) => {
      await expireLapsed(tx, now);

      const rooms = await tx.room.findMany({ where: { unit: { in: units }, archived: false }, include: { rate: true } });
      const gone = units.filter((u) => !rooms.some((r) => r.unit === u));
      if (gone.length) throw new Refused({ ok: false, error: "not_bookable", units: gone });

      const clash = await takenUnits(tx, units, nights);
      if (clash.length) throw new Refused({ ok: false, error: "unavailable", units: clash });

      const rates = rooms.flatMap((r) => (r.rate ? [toRate(r.rate)] : []));
      const rateOf = (u: UnitId) => rates.find((r) => r.unit === u);
      if (!admin) {
        const closed = units.filter((u) => !rateOf(u)?.bookable);
        if (closed.length) throw new Refused({ ok: false, error: "not_bookable", units: closed });
        const short = units.filter((u) => nights.length < (rateOf(u)?.minNights ?? 1));
        if (short.length) throw new Refused({ ok: false, error: "min_nights", units: short });
      }

      let q = quote(rates, input.checkIn, input.checkOut, units);
      if (input.promoCode?.trim()) {
        const found = await findUsablePromo(tx, input.promoCode, { ...input, units, today: jakartaToday(now) });
        if (!found.ok) throw new Refused({ ok: false, error: "promo", promoError: found.error });
        q = applyPromo(q, found.promo);
      }

      const settings = await readSettings(tx);
      const paid = !!input.paid;
      const by = admin ? "admin" : "guest";
      const code = await freeCode(tx);
      const events: Prisma.BookingEventCreateWithoutBookingInput[] = [
        { by, event: admin ? "Pesanan dibuat oleh admin" : "Pesanan dibuat di website", at: now },
      ];
      if (q.promo) events.push({ by, event: `Kode promo ${q.promo.code} dipakai, potongan Rp ${q.promo.discount.toLocaleString("id-ID")}`, at: now });

      await tx.booking.create({
        data: {
          code,
          status: paid ? "confirmed" : "pending",
          source: admin ? "admin" : "website",
          locale: input.locale,
          checkIn: fromDay(input.checkIn),
          checkOut: fromDay(input.checkOut),
          guests: input.guests,
          guestName: input.guest.name.trim(),
          guestEmail: email,
          guestPhone: phone,
          notes: input.notes?.trim() || null,
          quote: q as unknown as Prisma.InputJsonValue,
          promoId: q.promo?.id ?? null,
          createdAt: now,
          units: { create: units.map((unit) => ({ unit })) },
          payment: {
            create: {
              method: input.method,
              amount: q.total,
              status: paid ? "paid" : "pending",
              /* Filled in by the payment step once the charge exists. */
              reference: "",
              expiresAt: new Date(now.getTime() + settings.holdMinutes * 60_000),
              paidAt: paid ? now : null,
            },
          },
          events: { create: events },
        },
      });

      const claimed = await claimNights(tx, units, nights, { bookingCode: code });
      if (!claimed.ok) throw new Refused({ ok: false, error: "unavailable", units: claimed.units });

      const row = await tx.booking.findUniqueOrThrow({ where: { code }, include: bookingInclude });
      return { ok: true as const, booking: toBooking(row) };
    });
  } catch (e) {
    if (e instanceof Refused) return e.result;
    /* Lost a race for the same night: the other booking committed first. */
    if (isUniqueViolation(e)) {
      const clash = await db.$transaction((tx) => takenUnits(tx, units, nights));
      return { ok: false, error: "unavailable", units: clash.length ? clash : units };
    }
    throw e;
  }
}

/* --- Status transitions ------------------------------------------------------
   BOOKING.md §1: money first, then a person. Every transition is a
   status-guarded update (WHERE status IN from), so two admins pressing
   "Terima" at once, or a webhook arriving twice, change the booking once. */

export type TransitionResult =
  | { ok: true; booking: Booking; templates: TemplateId[] }
  | { ok: false; error: "state" | "not_found" | "invalid" };

type Actor = { by: HistoryEvent["by"]; adminId?: string };

class Stop extends Error {
  constructor(readonly error: "state" | "not_found" | "invalid") {
    super(error);
  }
}

/**
 * Moves one booking from one of `from` to `to` (null: no status change)
 * inside a transaction. `apply` runs only if the guarded update hit the row,
 * and returns the history text and the emails to send.
 */
async function transition(
  code: string,
  from: BookingStatus[],
  to: BookingStatus | null,
  actor: Actor,
  apply: (tx: Tx) => Promise<{ event?: string; templates?: TemplateId[] }>,
  now = new Date(),
): Promise<TransitionResult> {
  try {
    return await db.$transaction(async (tx) => {
      await expireLapsed(tx, now);
      const exists = await tx.booking.findFirst({ where: { code, deletedAt: null }, select: { code: true } });
      if (!exists) throw new Stop("not_found");
      /* Prisma skips an updateMany with no data (count 0), so an edit that
         keeps the status only checks it. */
      const hit = to
        ? (await tx.booking.updateMany({ where: { code, status: { in: from } }, data: { status: to } })).count
        : await tx.booking.count({ where: { code, status: { in: from } } });
      if (hit === 0) throw new Stop("state");
      const { event, templates = [] } = await apply(tx);
      if (event) await tx.bookingEvent.create({ data: { bookingCode: code, by: actor.by, adminId: actor.adminId ?? null, event, at: now } });
      const row = await tx.booking.findUniqueOrThrow({ where: { code }, include: bookingInclude });
      return { ok: true as const, booking: toBooking(row), templates };
    });
  } catch (e) {
    if (e instanceof Stop) return { ok: false, error: e.error };
    throw e;
  }
}

/** The webhook said paid: the booking now waits for the admin. Idempotent. */
export async function markPaidByGateway(code: string, gatewayId: string, at: Date, now = at): Promise<TransitionResult> {
  const r = await transition(
    code,
    ["pending"],
    "paid",
    { by: "gateway" },
    async (tx) => {
      await tx.payment.update({ where: { bookingCode: code }, data: { status: "paid", paidAt: at, gatewayId } });
      return { event: "Pembayaran diterima, menunggu konfirmasi admin", templates: ["payment_received"] };
    },
    now,
  );
  if (r.ok || r.error !== "state") return r;
  /* Already past pending. Paid before (the same notification again): success
     with nothing to do. Anything else (expired, cancelled) is the webhook's to
     handle as a refund. */
  const row = await db.booking.findUnique({ where: { code }, include: bookingInclude });
  if (row?.payment?.status === "paid" && ["paid", "confirmed", "checked_in", "completed"].includes(row.status)) {
    return { ok: true, booking: toBooking(row), templates: [] };
  }
  return r;
}

export const confirm = (code: string, adminId: string, now?: Date) =>
  transition(code, ["paid"], "confirmed", { by: "admin", adminId }, async () => ({ event: "Pesanan diterima admin", templates: ["confirmed"] }), now);

export function reject(code: string, reason: string, adminId: string, now?: Date) {
  const why = reason.trim();
  return transition(
    code,
    ["paid"],
    "rejected",
    { by: "admin", adminId },
    async (tx) => {
      await tx.booking.update({ where: { code }, data: { rejectReason: why || null, refundOwed: true } });
      await releaseNights(tx, { bookingCode: code });
      return { event: `Pesanan ditolak admin${why ? `: ${why}` : ""}`, templates: ["rejected"] };
    },
    now,
  );
}

/** Guest: only while unpaid (after paying, they ask the property). Admin: until arrival.
    System: an unpaid booking whose payment could not be opened. */
export function cancel(code: string, by: "guest" | "admin" | "system", reason?: string, adminId?: string, now?: Date) {
  const from: BookingStatus[] = by === "admin" ? ["pending", "paid", "confirmed"] : ["pending"];
  const why = reason?.trim();
  return transition(
    code,
    from,
    "cancelled",
    { by, adminId },
    async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({ where: { bookingCode: code } });
      if (payment.status === "pending") await tx.payment.update({ where: { bookingCode: code }, data: { status: "expired" } });
      if (payment.status === "paid") await tx.booking.update({ where: { code }, data: { refundOwed: true } });
      await releaseNights(tx, { bookingCode: code });
      return { event: why ? `Dibatalkan: ${why}` : by === "guest" ? "Dibatalkan oleh tamu" : "Dibatalkan oleh admin", templates: ["cancelled"] };
    },
    now,
  );
}

/** From the arrival day (`today`, Jakarta) onwards. */
export async function checkIn(code: string, adminId: string, today: string, now?: Date): Promise<TransitionResult> {
  const row = await db.booking.findUnique({ where: { code }, select: { checkIn: true } });
  if (row && today < toDay(row.checkIn)) return { ok: false, error: "state" };
  return transition(code, ["confirmed"], "checked_in", { by: "admin", adminId }, async () => ({ event: "Tamu check-in" }), now);
}

export const checkOut = (code: string, adminId: string, now?: Date) =>
  transition(code, ["checked_in"], "completed", { by: "admin", adminId }, async () => ({ event: "Tamu check-out" }), now);

/** A transfer or cash outside the gateway: the admin has seen the money, so it pays AND confirms. */
export function markPaidManually(code: string, note: string, adminId: string, now = new Date()) {
  const n = note.trim();
  return transition(
    code,
    ["pending"],
    "confirmed",
    { by: "admin", adminId },
    async (tx) => {
      const payment = await tx.payment.findUniqueOrThrow({ where: { bookingCode: code } });
      await tx.payment.update({ where: { bookingCode: code }, data: { method: "manual", status: "paid", paidAt: now, reference: n || payment.reference } });
      return { event: `Dibayar di luar gateway dan dikonfirmasi${n ? `: ${n}` : ""}`, templates: ["confirmed"] };
    },
    now,
  );
}

export type GuestPatch = { guest: Guest; guests: number; notes?: string };

const ANY: BookingStatus[] = ["pending", "paid", "confirmed", "rejected", "checked_in", "completed", "cancelled", "expired"];

/** Corrects who the booking is for. Dates, rooms and price are not editable (cancel and book again). */
export async function updateGuest(code: string, patch: GuestPatch, adminId: string): Promise<TransitionResult> {
  const phone = normalizePhone(patch.guest.phone);
  const email = patch.guest.email.trim();
  if (!patch.guest.name.trim() || !phone || (email && !isValidEmail(email)) || !(patch.guests >= 1)) return { ok: false, error: "invalid" };
  return transition(code, ANY, null, { by: "admin", adminId }, async (tx) => {
    await tx.booking.update({
      where: { code },
      data: { guestName: patch.guest.name.trim(), guestEmail: email, guestPhone: phone, guests: patch.guests, notes: patch.notes?.trim() || null },
    });
    return { event: "Data tamu diubah admin" };
  });
}

export const saveInternalNote = (code: string, internalNote: string) =>
  transition(code, ANY, null, { by: "admin" }, async (tx) => {
    await tx.booking.update({ where: { code }, data: { internalNote: internalNote.trim() || null } });
    return {};
  });

/** A booking by its code (any case), or null. Soft-deleted bookings are gone. */
export async function findBooking(code: string): Promise<Booking | null> {
  const row = await db.booking.findFirst({ where: { code: code.trim().toUpperCase(), deletedAt: null }, include: bookingInclude });
  return row && row.payment ? toBooking(row) : null;
}

/** Bookings that hold no nights and owe nothing more to anyone. */
export const DELETABLE: BookingStatus[] = ["cancelled", "expired", "rejected"];

/** Soft delete: hidden everywhere, the row kept for tax records. */
export async function softDelete(code: string, now = new Date()): Promise<{ ok: true } | { ok: false; error: "state" | "not_found" }> {
  return db.$transaction(async (tx) => {
    await expireLapsed(tx, now);
    const row = await tx.booking.findFirst({ where: { code, deletedAt: null }, select: { code: true } });
    if (!row) return { ok: false as const, error: "not_found" as const };
    const hit = await tx.booking.updateMany({ where: { code, status: { in: DELETABLE } }, data: { deletedAt: now } });
    return hit.count ? { ok: true as const } : { ok: false as const, error: "state" as const };
  });
}
