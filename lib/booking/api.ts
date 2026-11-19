"use client";

import type {
  Block,
  BlockReason,
  Booking,
  BookingStatus,
  ContentItem,
  ContentSection,
  CreateInput,
  CreateResult,
  Guest,
  MediaMeta,
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
import { refreshAll, saveToken, send, tokenQuery } from "./client";

/**
 * ============================================================================
 *  THE INTEGRATION SEAM: WRITES
 * ============================================================================
 *
 * Every write the interface makes goes through a function in this file, one
 * backend endpoint per function (docs/BOOKING.md §2), with the arguments and the
 * return shapes the prototype had, so no component changed. The server is
 * the authority: it re-checks availability, prices, promos and status rules.
 * After each write the cached reads (hooks.ts) are fetched again.
 */

/* Shared with the server (lib/server/bookings.ts), so they live in types.ts. */
export type { CreateError, CreateInput, CreateResult } from "./types";

const enc = encodeURIComponent;

/** A booking out of an endpoint that answers with one, or null. */
async function bookingFrom(url: string, method: "POST" | "PATCH", body: unknown = {}): Promise<Booking | null> {
  const r = await send<Booking>(url, method, body);
  await refreshAll();
  return r.ok ? r.data : null;
}

/* --- Guest ---------------------------------------------------------------- */

export type PromoResult = { ok: true; promo: Promo; quote: Quote } | { ok: false; error: PromoError; promo?: Promo };

/** POST /api/promos/check: the checkout's "Pakai" button. */
export async function checkPromo(input: { code: string; checkIn: string; checkOut: string; units: UnitId[] }): Promise<PromoResult> {
  const r = await send<PromoResult>("/api/promos/check", "POST", input);
  return r.ok && "ok" in r.data ? r.data : { ok: false, error: "not_found" };
}

/**
 * POST /api/bookings (the guest) or /api/admin/bookings (the admin's
 * "Booking manual", source "admin"). The guest's answer carries the order
 * page token, kept for this browser.
 */
export async function createBooking(input: CreateInput): Promise<CreateResult> {
  const admin = input.source === "admin";
  try {
    const r = await send<CreateResult & { token?: string }>(admin ? "/api/admin/bookings" : "/api/bookings", "POST", input);
    if (r.data && "ok" in r.data) {
      if (r.data.ok && r.data.token) saveToken(r.data.booking.code, r.data.token);
      if (r.data.ok) await refreshAll();
      return r.data.ok ? { ok: true, booking: r.data.booking } : r.data;
    }
  } catch {
    /* network */
  }
  return { ok: false, error: "invalid" };
}

/** POST /api/bookings/lookup {code, email}: "Cek pesanan". Keeps the token it gets. */
export async function findBooking(code: string, email: string): Promise<Booking | null> {
  const r = await send<{ booking: Booking; token: string }>("/api/bookings/lookup", "POST", { code, email });
  if (!r.ok) return null;
  saveToken(r.data.booking.code, r.data.token);
  await refreshAll();
  return r.data.booking;
}

/** POST /api/bookings/:code/check-payment: "Saya sudah bayar" asks DOKU early. */
export const checkPayment = (code: string) => bookingFrom(`/api/bookings/${enc(code)}/check-payment${tokenQuery(code)}`, "POST");

/** POST /api/bookings/:code/payment-method: new charge, same deadline. */
export const changePaymentMethod = (code: string, method: PaymentMethodId) =>
  bookingFrom(`/api/bookings/${enc(code)}/payment-method${tokenQuery(code)}`, "POST", { method });

/** The guest (only while unpaid) or the admin (until arrival) cancels. */
export function cancelBooking(code: string, by: "guest" | "admin", reason?: string) {
  return by === "guest"
    ? bookingFrom(`/api/bookings/${enc(code)}/cancel${tokenQuery(code)}`, "POST")
    : bookingFrom(`/api/admin/bookings/${enc(code)}/cancel`, "POST", { reason });
}

/* --- Admin ----------------------------------------------------------------
   Every function below is an authenticated admin endpoint (session cookie). */

/** Tells useAdminSession to ask the server again. */
const sessionChanged = () => window.dispatchEvent(new Event("sv-admin-session"));

/** POST /api/admin/login with an email or username: the server sets an httpOnly session cookie. */
export async function adminLogin(login: string, password: string) {
  if (!login.trim() || !password) return false;
  try {
    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ login, password }),
    });
    if (!res.ok) return false;
  } catch {
    return false;
  }
  sessionChanged();
  return true;
}

/** POST /api/admin/logout. Fire and forget: the shell navigates to the login at once. */
export function adminLogout() {
  void fetch("/api/admin/logout", { method: "POST" })
    .catch(() => undefined)
    .finally(sessionChanged);
}

/** Accept a paid booking (only from paid); the guest gets `confirmed`. */
export const confirmBooking = (code: string) => bookingFrom(`/api/admin/bookings/${enc(code)}/confirm`, "POST");

/** Reject a paid booking: nights released, `rejected` emailed, a refund owed. */
export const rejectBooking = (code: string, reason: string) => bookingFrom(`/api/admin/bookings/${enc(code)}/reject`, "POST", { reason });

/** Check in (from the arrival day) or check out. */
export const setBookingStatus = (code: string, status: BookingStatus) => bookingFrom(`/api/admin/bookings/${enc(code)}/status`, "PATCH", { status });

/** Transfer or cash outside DOKU: pays and confirms in one step. */
export const markPaidManually = (code: string, note: string) => bookingFrom(`/api/admin/bookings/${enc(code)}/mark-paid`, "POST", { note });

export const resendNotification = (code: string, template: TemplateId) => bookingFrom(`/api/admin/bookings/${enc(code)}/notify`, "POST", { template });

export const saveInternalNote = (code: string, internalNote: string) => bookingFrom(`/api/admin/bookings/${enc(code)}`, "PATCH", { internalNote });

export type BookingPatch = { guest: Guest; guests: number; notes?: string };

/** Corrects who the booking is for. Dates, rooms and price are not editable (cancel and book again). */
export async function updateBooking(code: string, input: BookingPatch): Promise<{ ok: true; booking: Booking } | { ok: false }> {
  const r = await send<{ ok: boolean; booking?: Booking }>(`/api/admin/bookings/${enc(code)}`, "PATCH", input);
  await refreshAll();
  return r.ok && r.data.ok && r.data.booking ? { ok: true, booking: r.data.booking } : { ok: false };
}

/** Bookings that can be erased: ones that never became, or no longer are, a stay. */
export const DELETABLE: BookingStatus[] = ["cancelled", "expired", "rejected"];

/** Soft delete; only cancelled, expired or rejected. */
export async function deleteBooking(code: string): Promise<{ ok: boolean }> {
  const r = await send(`/api/admin/bookings/${enc(code)}`, "DELETE");
  await refreshAll();
  return { ok: r.ok };
}

type BlockInput = { unit: UnitId; from: string; to: string; reason: BlockReason; note?: string };
type BlockResult = { ok: true; block: Block } | { ok: false; clash: string };

/** Close dates by hand; an overlap answers { ok: false, clash }. */
/* The calendar form names the clashing night; a refusal without one (a room
   archived meanwhile) is reported on the first night asked for. */
const blockAnswer = (data: { ok?: boolean; block?: Block; clash?: string }, input: BlockInput): BlockResult =>
  data?.ok && data.block ? { ok: true, block: data.block } : { ok: false, clash: data?.clash ?? input.from };

export async function createBlock(input: BlockInput): Promise<BlockResult> {
  const r = await send<{ ok?: boolean; block?: Block; clash?: string }>("/api/admin/blocks", "POST", input);
  await refreshAll();
  return blockAnswer(r.data, input);
}

export async function updateBlock(id: string, input: BlockInput): Promise<BlockResult> {
  const r = await send<{ ok?: boolean; block?: Block; clash?: string }>(`/api/admin/blocks/${enc(id)}`, "PUT", input);
  await refreshAll();
  return blockAnswer(r.data, input);
}

/** "Buka kembali". */
export async function deleteBlock(id: string) {
  await send(`/api/admin/blocks/${enc(id)}`, "DELETE");
  await refreshAll();
}

/** A save that answers nothing to the form; a refusal is logged (the form is already validated). */
async function save(url: string, method: "PUT", body: unknown) {
  const r = await send(url, method, body);
  if (!r.ok) console.error(`Saving ${url} failed (${r.status})`, r.data);
  await refreshAll();
}

export const saveRate = (rate: UnitRate) => save(`/api/admin/rates/${enc(rate.unit)}`, "PUT", rate);
export const saveSettings = (settings: Settings) => save("/api/admin/settings", "PUT", settings);
/** Also refreshes the public page of that section. */
export const saveContent = (section: ContentSection, items: ContentItem[]) => save(`/api/admin/content/${enc(section)}`, "PUT", items);
/** Also refreshes the room pages. */
export const saveRoom = (room: Room) => save(`/api/admin/rooms/${enc(room.unit)}`, "PUT", room);
/** Alt text for a photograph. */
export const saveMedia = (src: string, meta: MediaMeta) => save("/api/admin/media", "PUT", { src, meta });

/** A new room starts empty and NOT for sale online. */
export async function createRoom(name: string): Promise<Room> {
  const r = await send<Room>("/api/admin/rooms", "POST", { name });
  await refreshAll();
  if (!r.ok) throw new Error("createRoom failed");
  return r.data;
}

/** Refused while a booking still holds the room for a night to come. */
export async function archiveRoom(unit: UnitId): Promise<{ ok: true } | { ok: false; codes: string[] }> {
  const r = await send<{ ok: true } | { ok: false; codes: string[] }>(`/api/admin/rooms/${enc(unit)}`, "DELETE");
  await refreshAll();
  return r.data && "ok" in r.data ? r.data : { ok: false, codes: [] };
}

/* --- Promo codes --------------------------------------------------------- */

export type PromoInput = Omit<Promo, "id" | "createdAt">;
export type PromoSaveError = "code" | "duplicate" | "value";

type PromoSave = { ok: true; promo: Promo } | { ok: false; error: PromoSaveError };

export async function createPromo(input: PromoInput): Promise<PromoSave> {
  const r = await send<PromoSave>("/api/admin/promos", "POST", input);
  await refreshAll();
  return r.data && "ok" in r.data ? r.data : { ok: false, error: "value" };
}

/** Bookings that already used it keep the discount they got. */
export async function savePromo(promo: Promo): Promise<PromoSave> {
  const r = await send<PromoSave>(`/api/admin/promos/${enc(promo.id)}`, "PUT", promo);
  await refreshAll();
  return r.data && "ok" in r.data ? r.data : { ok: false, error: "value" };
}

export async function deletePromo(id: string) {
  await send(`/api/admin/promos/${enc(id)}`, "DELETE");
  await refreshAll();
}
