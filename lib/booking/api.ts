"use client";

import type {
  Block,
  BlockReason,
  Booking,
  BookingStatus,
  Content,
  CreateInput,
  CreateResult,
  ContentSection,
  ContentItem,
  Guest,
  MediaMeta,
  NotificationLog,
  PaymentMethodId,
  Promo,
  PromoError,
  Quote,
  Room,
  Settings,
  TemplateId,
  UnitId,
  UnitRate,
} from "./types";
import { MOCK_LATENCY_MS } from "./config";
import { bookingCode, isValidEmail, nightsOf, normalizePhone, todayISO, uid } from "./format";
import { effectiveStatus, isTaken, occupancy } from "./occupancy";
import { HOLDING } from "./types";
import { quote } from "./pricing";
import { applyPromo, normalizeCode, promoProblem, promoUses } from "./promo";
import { mockReference } from "./payments";
import { getDB, resetDB, setDB, sweep } from "./store";

/**
 * ============================================================================
 *  THE INTEGRATION SEAM
 * ============================================================================
 *
 * Every write the interface makes goes through a function in this file, and
 * every function returns a Promise. The interface never touches storage.
 *
 * In the prototype these run against the mock store in the browser. In
 * production each becomes a call to the backend, one endpoint per function,
 * with the same arguments and the same return shape. BOOKING.md lists them
 * with the server side rules each one must enforce (price computed on the
 * server, availability re-checked inside a transaction, admin routes behind
 * authentication).
 *
 * Reads live in hooks.ts and follow the same rule.
 */

const wait = (ms = MOCK_LATENCY_MS) => new Promise((r) => setTimeout(r, ms));
const nowISO = () => new Date().toISOString();

function find(code: string) {
  return getDB().bookings.find((b) => b.code.toUpperCase() === code.trim().toUpperCase()) ?? null;
}

function patch(code: string, update: (b: Booking) => Booking) {
  let out: Booking | null = null;
  setDB((db) => ({
    ...db,
    bookings: db.bookings.map((b) => {
      if (b.code !== code) return b;
      out = update(b);
      return out;
    }),
  }));
  return out as Booking | null;
}

/** "Sends" an email. Production: server side, through an email provider. */
function notify(b: Booking, template: TemplateId): NotificationLog[] {
  if (!b.guest.email) return [];
  return [{ id: uid(), template, to: b.guest.email, at: nowISO(), status: "simulated" }];
}

/* --- Guest ---------------------------------------------------------------- */

/* Shared with the server (lib/server/bookings.ts), so they live in types.ts. */
export type { CreateError, CreateInput, CreateResult } from "./types";

/** Looks a code up and checks it against a stay. */
function findPromo(db: ReturnType<typeof getDB>, code: string, ctx: { checkIn: string; checkOut: string; units: UnitId[] }) {
  const wanted = normalizeCode(code);
  const promo = db.promos.find((p) => p.code === wanted);
  if (!promo) return { ok: false as const, error: "not_found" as PromoError };
  const problem = promoProblem(promo, {
    nights: nightsOf(ctx.checkIn, ctx.checkOut).length,
    units: ctx.units,
    today: todayISO(),
    uses: promoUses(promo, db.bookings),
  });
  return problem ? { ok: false as const, error: problem, promo } : { ok: true as const, promo };
}

export type PromoResult = { ok: true; promo: Promo; quote: Quote } | { ok: false; error: PromoError; promo?: Promo };

/**
 * POST /api/promos/check  { code, checkIn, checkOut, units }
 *
 * The "Pakai" button at checkout. Server: rate limit it (codes can be
 * guessed), answer with the discounted quote, and never list other codes.
 */
export async function checkPromo(input: { code: string; checkIn: string; checkOut: string; units: UnitId[] }): Promise<PromoResult> {
  await wait(350);
  const db = getDB();
  const found = findPromo(db, input.code, input);
  if (!found.ok) return found;
  return { ok: true, promo: found.promo, quote: applyPromo(quote(db.rates, input.checkIn, input.checkOut, input.units), found.promo) };
}

/**
 * POST /api/bookings
 *
 * Server: validate input, re-check availability INSIDE a transaction (two
 * guests can press "pay" for the same night in the same second), compute the
 * price from the server's own rates, create the charge with the payment
 * gateway, store the booking as pending with the gateway's reference and
 * expiry, then email `awaiting_payment`.
 */
export async function createBooking(input: CreateInput): Promise<CreateResult> {
  await wait();
  sweep();
  const db = getDB();

  const phone = normalizePhone(input.guest.phone);
  /* A guest on the website must give an email. A booking the admin takes over
     WhatsApp may not have one; the WhatsApp number is enough. */
  const emailOk = isValidEmail(input.guest.email) || (input.source === "admin" && !input.guest.email.trim());
  if (!input.units.length || input.checkOut <= input.checkIn || !input.guest.name.trim() || !emailOk || !phone) {
    return { ok: false, error: "invalid" };
  }

  const nights = nightsOf(input.checkIn, input.checkOut);
  const gone = input.units.filter((u) => !db.rooms.some((r) => r.unit === u && !r.archived));
  if (gone.length) return { ok: false, error: "not_bookable", units: gone };

  const occ = occupancy(db.bookings, db.blocks);
  const clashing = input.units.filter((u) => nights.some((n) => isTaken(occ, u, n)));
  if (clashing.length) return { ok: false, error: "unavailable", units: clashing };

  const closed = input.units.filter((u) => !db.rates.find((r) => r.unit === u)?.bookable);
  if (closed.length && input.source !== "admin") return { ok: false, error: "not_bookable", units: closed };

  const short = input.units.filter((u) => nights.length < (db.rates.find((r) => r.unit === u)?.minNights ?? 1));
  if (short.length && input.source !== "admin") return { ok: false, error: "min_nights", units: short };

  let code = bookingCode();
  while (find(code)) code = bookingCode();

  let q = quote(db.rates, input.checkIn, input.checkOut, input.units);
  if (input.promoCode?.trim()) {
    const found = findPromo(db, input.promoCode, input);
    if (!found.ok) return { ok: false, error: "promo", promoError: found.error };
    q = applyPromo(q, found.promo);
  }
  const created = new Date();
  const expiresAt = new Date(created.getTime() + db.settings.holdMinutes * 60_000).toISOString();
  const paid = !!input.paid;

  const booking: Booking = {
    code,
    createdAt: created.toISOString(),
    status: paid ? "confirmed" : "pending",
    source: input.source ?? "website",
    locale: input.locale,
    checkIn: input.checkIn,
    checkOut: input.checkOut,
    units: input.units,
    guests: input.guests,
    guest: { name: input.guest.name.trim(), email: input.guest.email.trim(), phone },
    notes: input.notes?.trim() || undefined,
    quote: q,
    payment: {
      method: input.method,
      amount: q.total,
      status: paid ? "paid" : "pending",
      reference: mockReference(input.method, code),
      expiresAt,
      paidAt: paid ? created.toISOString() : undefined,
    },
    notifications: [],
    history: [
      {
        at: created.toISOString(),
        by: input.source === "admin" ? "admin" : "guest",
        event: input.source === "admin" ? "Pesanan dibuat oleh admin" : "Pesanan dibuat di website",
      },
      ...(q.promo
        ? [{ at: created.toISOString(), by: (input.source === "admin" ? "admin" : "guest") as "admin" | "guest", event: `Kode promo ${q.promo.code} dipakai, potongan Rp ${q.promo.discount.toLocaleString("id-ID")}` }]
        : []),
    ],
  };
  booking.notifications = notify(booking, paid ? "confirmed" : "awaiting_payment");

  setDB((d) => ({ ...d, bookings: [booking, ...d.bookings] }));
  return { ok: true, booking };
}

/** GET /api/bookings/:code  (production: by a signed token, see BOOKING.md) */
export async function getBooking(code: string) {
  await wait(150);
  sweep();
  return find(code);
}

/** POST /api/bookings/lookup  { code, email } */
export async function findBooking(code: string, email: string) {
  await wait();
  sweep();
  const b = find(code);
  return b && b.guest.email.toLowerCase() === email.trim().toLowerCase() ? b : null;
}

/**
 * POST /api/bookings/:code/check-payment
 *
 * The "I have paid" button. The truth comes from the gateway's webhook; this
 * only asks the gateway early, so a guest who has just paid is not left
 * waiting for the webhook.
 */
export async function checkPayment(code: string) {
  await wait(900);
  sweep();
  return find(code);
}

/** POST /api/bookings/:code/payment-method  (new charge, same expiry) */
export async function changePaymentMethod(code: string, method: PaymentMethodId) {
  await wait();
  return patch(code, (b) => ({
    ...b,
    payment: { ...b.payment, method, reference: mockReference(method, b.code) },
    history: [...b.history, { at: nowISO(), by: "guest", event: "Cara bayar diganti" }],
  }));
}

/** POST /api/bookings/:code/cancel */
export async function cancelBooking(code: string, by: "guest" | "admin", reason?: string) {
  await wait();
  return patch(code, (b) => ({
    ...b,
    status: "cancelled",
    payment: b.payment.status === "pending" ? { ...b.payment, status: "expired" } : b.payment,
    history: [...b.history, { at: nowISO(), by, event: reason ? `Dibatalkan: ${reason}` : by === "guest" ? "Dibatalkan oleh tamu" : "Dibatalkan oleh admin" }],
    notifications: [...b.notifications, ...notify(b, "cancelled")],
  }));
}

/**
 * PROTOTYPE ONLY. Stands in for the payment gateway's webhook
 * (POST /api/webhooks/payment). In production a paid event moves the booking
 * to `paid`, which means WAITING FOR THE ADMIN, and emails `payment_received`;
 * an expiry moves it to `expired` and emails `expired`.
 */
export async function simulateGateway(code: string, outcome: "paid" | "expired") {
  await wait();
  const at = nowISO();
  return patch(code, (b) =>
    outcome === "paid"
      ? {
          ...b,
          status: "paid",
          payment: { ...b.payment, status: "paid", paidAt: at, gatewayId: `demo_${b.code}` },
          history: [...b.history, { at, by: "gateway", event: "Pembayaran diterima, menunggu konfirmasi admin" }],
          notifications: [...b.notifications, ...notify(b, "payment_received")],
        }
      : {
          ...b,
          status: "expired",
          payment: { ...b.payment, status: "expired", expiresAt: at },
          history: [...b.history, { at, by: "system", event: "Waktu pembayaran habis" }],
          notifications: [...b.notifications, ...notify(b, "expired")],
        },
  );
}

/* --- Admin ----------------------------------------------------------------
   Every function below is an authenticated admin endpoint in production. */

const SESSION = "sv-admin-session";

/** POST /api/admin/login. Prototype: any filled in email and password. */
export async function adminLogin(email: string, password: string) {
  await wait();
  if (!email.trim() || !password) return false;
  sessionStorage.setItem(SESSION, JSON.stringify({ email: email.trim(), at: nowISO() }));
  window.dispatchEvent(new Event("sv-admin-session"));
  return true;
}

export function adminLogout() {
  sessionStorage.removeItem(SESSION);
  window.dispatchEvent(new Event("sv-admin-session"));
}

export function readAdminSession(): { email: string } | null {
  try {
    const raw = sessionStorage.getItem(SESSION);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

/**
 * POST /api/admin/bookings/:code/confirm
 *
 * The admin accepts a paid booking: it becomes a stay, and the guest gets the
 * `confirmed` email. Only valid from `paid`.
 */
export async function confirmBooking(code: string) {
  await wait();
  const at = nowISO();
  return patch(code, (b) =>
    b.status !== "paid"
      ? b
      : {
          ...b,
          status: "confirmed",
          history: [...b.history, { at, by: "admin", event: "Pesanan diterima admin" }],
          notifications: [...b.notifications, ...notify(b, "confirmed")],
        },
  );
}

/**
 * POST /api/admin/bookings/:code/reject  { reason }
 *
 * The admin rejects a paid booking: the nights are released, the guest gets
 * the `rejected` email with the reason, and A REFUND IS OWED. The refund
 * itself is made at the gateway (or by transfer) and is not automated here.
 */
export async function rejectBooking(code: string, reason: string) {
  await wait();
  const at = nowISO();
  return patch(code, (b) => {
    if (b.status !== "paid") return b;
    const rejected: Booking = {
      ...b,
      status: "rejected",
      rejectReason: reason.trim() || undefined,
      history: [...b.history, { at, by: "admin", event: `Pesanan ditolak admin${reason.trim() ? `: ${reason.trim()}` : ""}` }],
    };
    return { ...rejected, notifications: [...b.notifications, ...notify(rejected, "rejected")] };
  });
}

/** PATCH /api/admin/bookings/:code/status  (check in, check out) */
export async function setBookingStatus(code: string, status: BookingStatus) {
  await wait();
  const label: Partial<Record<BookingStatus, string>> = {
    checked_in: "Tamu check-in",
    completed: "Tamu check-out",
  };
  return patch(code, (b) => ({
    ...b,
    status,
    history: [...b.history, { at: nowISO(), by: "admin", event: label[status] ?? `Status diubah: ${status}` }],
  }));
}

/**
 * POST /api/admin/bookings/:code/mark-paid
 *
 * A transfer or cash outside the gateway. The admin has seen the money, so
 * this both pays and confirms in one step.
 */
export async function markPaidManually(code: string, note: string) {
  await wait();
  const at = nowISO();
  return patch(code, (b) => ({
    ...b,
    status: "confirmed",
    payment: { ...b.payment, method: "manual", status: "paid", paidAt: at, reference: note || b.payment.reference },
    history: [...b.history, { at, by: "admin", event: `Dibayar di luar gateway dan dikonfirmasi${note ? `: ${note}` : ""}` }],
    notifications: [...b.notifications, ...notify(b, "confirmed")],
  }));
}

/** POST /api/admin/bookings/:code/notify  { template } */
export async function resendNotification(code: string, template: TemplateId) {
  await wait();
  return patch(code, (b) => ({
    ...b,
    notifications: [...b.notifications, ...notify(b, template)],
    history: [...b.history, { at: nowISO(), by: "admin", event: "Email dikirim ulang" }],
  }));
}

/** PATCH /api/admin/bookings/:code  { internalNote } */
export async function saveInternalNote(code: string, internalNote: string) {
  await wait(250);
  return patch(code, (b) => ({ ...b, internalNote }));
}

export type BookingPatch = { guest: Guest; guests: number; notes?: string };

/**
 * PATCH /api/admin/bookings/:code  { guest, guests, notes }
 *
 * Corrects who the booking is for: a misspelt name, a new number, one more
 * guest. Dates, rooms and the price are not edited here; cancel and book
 * again so availability and payment stay right.
 */
export async function updateBooking(code: string, input: BookingPatch) {
  await wait();
  const phone = normalizePhone(input.guest.phone);
  const email = input.guest.email.trim();
  if (!input.guest.name.trim() || !phone || (email && !isValidEmail(email)) || input.guests < 1) return { ok: false as const };
  const booking = patch(code, (b) => ({
    ...b,
    guest: { name: input.guest.name.trim(), email, phone },
    guests: input.guests,
    notes: input.notes?.trim() || undefined,
    history: [...b.history, { at: nowISO(), by: "admin", event: "Data tamu diubah admin" }],
  }));
  return booking ? { ok: true as const, booking } : { ok: false as const };
}

/** Bookings that can be erased: ones that never became, or no longer are, a stay. */
export const DELETABLE: BookingStatus[] = ["cancelled", "expired", "rejected"];

/**
 * DELETE /api/admin/bookings/:code
 *
 * Only for bookings that hold no nights and owe nothing more to anyone
 * (cancelled, expired, rejected), to keep the list tidy or honour a guest's
 * request to be forgotten (UU PDP). Production: soft delete, and keep what
 * the tax records need.
 */
export async function deleteBooking(code: string) {
  await wait(300);
  const b = find(code);
  if (!b || !DELETABLE.includes(effectiveStatus(b))) return { ok: false as const };
  setDB((d) => ({ ...d, bookings: d.bookings.filter((x) => x.code !== b.code) }));
  return { ok: true as const };
}

/** POST /api/admin/blocks  (close dates by hand; overlaps are refused) */
export async function createBlock(input: { unit: UnitId; from: string; to: string; reason: BlockReason; note?: string }) {
  await wait();
  const db = getDB();
  const occ = occupancy(db.bookings, db.blocks);
  const clash = nightsOf(input.from, input.to).find((n) => isTaken(occ, input.unit, n));
  if (clash) return { ok: false as const, clash };
  const block: Block = { id: uid(), ...input };
  setDB((d) => ({ ...d, blocks: [...d.blocks, block] }));
  return { ok: true as const, block };
}

/** PUT /api/admin/blocks/:id  (change the room, dates, reason or note; overlaps are refused) */
export async function updateBlock(id: string, input: { unit: UnitId; from: string; to: string; reason: BlockReason; note?: string }) {
  await wait();
  const db = getDB();
  const occ = occupancy(db.bookings, db.blocks.filter((b) => b.id !== id));
  const clash = nightsOf(input.from, input.to).find((n) => isTaken(occ, input.unit, n));
  if (clash) return { ok: false as const, clash };
  const block: Block = { id, ...input };
  setDB((d) => ({ ...d, blocks: d.blocks.map((b) => (b.id === id ? block : b)) }));
  return { ok: true as const, block };
}

/** DELETE /api/admin/blocks/:id  (open the dates again) */
export async function deleteBlock(id: string) {
  await wait(250);
  setDB((d) => ({ ...d, blocks: d.blocks.filter((b) => b.id !== id) }));
}

/** PUT /api/admin/rates/:unit */
export async function saveRate(rate: UnitRate) {
  await wait();
  setDB((d) => ({ ...d, rates: d.rates.map((r) => (r.unit === rate.unit ? rate : r)) }));
}

/** PUT /api/admin/settings */
export async function saveSettings(settings: Settings) {
  await wait();
  setDB((d) => ({ ...d, settings }));
}

/** PUT /api/admin/content/:section. Production: also revalidates the public pages. */
export async function saveContent(section: ContentSection, items: ContentItem[]) {
  await wait();
  setDB((d) => ({ ...d, content: { ...d.content, [section]: items } as Content }));
}

/** PUT /api/admin/rooms/:unit. Production: also revalidates the room pages. */
export async function saveRoom(room: Room) {
  await wait();
  setDB((d) => ({ ...d, rooms: d.rooms.map((r) => (r.unit === room.unit ? room : r)) }));
}

/**
 * POST /api/admin/rooms. A new room starts empty and NOT for sale online, so
 * nothing half filled in can be booked; the owner switches it on once it has
 * a name, photographs and a price.
 */
export async function createRoom(name: string): Promise<Room> {
  await wait(250);
  const room: Room = {
    unit: `room-${uid().slice(0, 8)}`,
    name: name.trim() || "Kamar baru",
    size: 30,
    bedrooms: 1,
    bathrooms: 1,
    features: [],
    description: { id: "", en: "" },
    photos: [],
  };
  const rate: UnitRate = { unit: room.unit, weekday: 0, weekend: 0, minNights: 1, bookable: false, seasons: [] };
  setDB((d) => ({ ...d, rooms: [...d.rooms, room], rates: [...d.rates, rate] }));
  return room;
}

/**
 * DELETE /api/admin/rooms/:unit. Refused while a booking still holds the room
 * for a night that has not passed: those guests are coming. Otherwise the room
 * is archived (taken off sale, out of every list) rather than erased, so past
 * bookings still name it.
 */
export async function archiveRoom(unit: UnitId) {
  await wait(250);
  const db = getDB();
  const today = todayISO();
  const upcoming = db.bookings.filter((b) => b.units.includes(unit) && HOLDING.includes(effectiveStatus(b)) && b.checkOut > today);
  if (upcoming.length) return { ok: false as const, codes: upcoming.map((b) => b.code) };
  setDB((d) => ({
    ...d,
    rooms: d.rooms.map((r) => (r.unit === unit ? { ...r, archived: true } : r)),
    rates: d.rates.map((r) => (r.unit === unit ? { ...r, bookable: false } : r)),
    blocks: d.blocks.filter((k) => k.unit !== unit),
  }));
  return { ok: true as const };
}

/** PUT /api/admin/media/:id  (alt text for an uploaded photograph) */
export async function saveMedia(src: string, meta: MediaMeta) {
  await wait(200);
  setDB((d) => ({ ...d, media: { ...d.media, [src]: meta } }));
}

/* --- Promo codes --------------------------------------------------------- */

export type PromoInput = Omit<Promo, "id" | "createdAt">;
export type PromoSaveError = "code" | "duplicate" | "value";

function validPromo(input: PromoInput, id?: string): PromoSaveError | null {
  const code = normalizeCode(input.code);
  if (!/^[A-Z0-9-]{3,20}$/.test(code)) return "code";
  if (getDB().promos.some((p) => p.code === code && p.id !== id)) return "duplicate";
  if (input.value <= 0 || (input.kind === "percent" && input.value > 100)) return "value";
  return null;
}

/** POST /api/admin/promos */
export async function createPromo(input: PromoInput) {
  await wait();
  const error = validPromo(input);
  if (error) return { ok: false as const, error };
  const promo: Promo = { ...input, code: normalizeCode(input.code), id: uid(), createdAt: nowISO() };
  setDB((d) => ({ ...d, promos: [promo, ...d.promos] }));
  return { ok: true as const, promo };
}

/** PUT /api/admin/promos/:id. Bookings that already used it keep the discount they got. */
export async function savePromo(promo: Promo) {
  await wait();
  const error = validPromo(promo, promo.id);
  if (error) return { ok: false as const, error };
  const next = { ...promo, code: normalizeCode(promo.code) };
  setDB((d) => ({ ...d, promos: d.promos.map((p) => (p.id === promo.id ? next : p)) }));
  return { ok: true as const, promo: next };
}

/** DELETE /api/admin/promos/:id. Bookings that used it keep their discount. */
export async function deletePromo(id: string) {
  await wait(250);
  setDB((d) => ({ ...d, promos: d.promos.filter((p) => p.id !== id) }));
}

/** PROTOTYPE ONLY: back to the generated demo data. */
export async function resetDemo() {
  await wait(300);
  resetDB();
}

export const unitName = (id: UnitId) => getDB().rooms.find((r) => r.unit === id)?.name ?? id;
