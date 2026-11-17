import type { TransitionResult } from "./bookings";
import { findBooking } from "./bookings";
import { db } from "./db";
import { json } from "./http";
import { sendTemplates } from "./mail";
import { bookingInclude, toBooking } from "./mappers";

/** The booking as the admin sees it (with the internal note), or null. */
export async function adminBooking(code: string) {
  const row = await db.booking.findFirst({ where: { code: code.trim().toUpperCase(), deletedAt: null }, include: bookingInclude });
  return row && row.payment ? toBooking(row) : null;
}

/**
 * Answers a status transition: 404 unknown, 409 not allowed from its current
 * status, else the emails it calls for are sent (after commit) and the
 * booking comes back as it now is.
 */
export async function answerTransition(code: string, r: TransitionResult) {
  if (!r.ok) return json({ ok: false, error: r.error }, r.error === "not_found" ? 404 : r.error === "invalid" ? 400 : 409);
  await sendTemplates(code, r.templates);
  return json((await adminBooking(code)) ?? r.booking);
}

export { findBooking };
