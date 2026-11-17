import { withAdmin } from "@/lib/server/admin-route";
import { adminBooking, answerTransition } from "@/lib/server/admin-bookings";
import { bookingPatchBody } from "@/lib/server/admin-schemas";
import { saveInternalNote, softDelete, updateGuest } from "@/lib/server/bookings";
import { json, notFound, parseBody } from "@/lib/server/http";

type P = { code: string };

/** GET /api/admin/bookings/:code: the booking detail, with the internal note. */
export const GET = withAdmin<P>(async (_req, _admin, { code }) => {
  const b = await adminBooking(code);
  return b ? json(b) : notFound();
});

/**
 * PATCH /api/admin/bookings/:code
 *   { internalNote }             saveInternalNote → the booking
 *   { guest, guests, notes }     updateBooking → { ok, booking } | { ok: false }
 * Dates, rooms and price are not editable: cancel and book again.
 */
export const PATCH = withAdmin<P>(async (req, admin, { code }) => {
  const body = await parseBody(req, bookingPatchBody);
  if (!body) return json({ ok: false, error: "invalid" }, 400);
  const c = code.trim().toUpperCase();
  if ("internalNote" in body) return answerTransition(c, await saveInternalNote(c, body.internalNote));
  const r = await updateGuest(c, body, admin.adminId);
  if (!r.ok) return json({ ok: false }, r.error === "not_found" ? 404 : 400);
  return json({ ok: true, booking: await adminBooking(c) });
});

/** DELETE /api/admin/bookings/:code: soft delete, only cancelled, expired or rejected. */
export const DELETE = withAdmin<P>(async (_req, _admin, { code }) => {
  const r = await softDelete(code.trim().toUpperCase());
  if (r.ok) return json({ ok: true });
  return json({ ok: false }, r.error === "not_found" ? 404 : 409);
});
