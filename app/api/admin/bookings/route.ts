import { effectiveStatus } from "@/lib/booking/occupancy";
import type { PaymentMethodId } from "@/lib/booking/types";
import { withAdmin } from "@/lib/server/admin-route";
import { manualBookingBody } from "@/lib/server/admin-schemas";
import { createBooking } from "@/lib/server/bookings";
import { db } from "@/lib/server/db";
import { json, parseBody } from "@/lib/server/http";
import { sendTemplates } from "@/lib/server/mail";
import { bookingInclude, toBooking } from "@/lib/server/mappers";

/**
 * GET /api/admin/bookings (useBookings): every booking that is not deleted,
 * with its status as it is now (a lapsed hold reads as expired), newest
 * first, and the count waiting for a decision (the sidebar badge). A single
 * property has hundreds of bookings a year, not millions: the list screen
 * groups and filters them itself, so no paging.
 */
export const GET = withAdmin(async () => {
  const rows = await db.booking.findMany({ where: { deletedAt: null }, include: bookingInclude, orderBy: { createdAt: "desc" } });
  const now = Date.now();
  const bookings = rows.filter((r) => r.payment).map((r) => {
    const b = toBooking(r);
    return { ...b, status: effectiveStatus(b, now) };
  });
  return json({ bookings, paidCount: bookings.filter((b) => b.status === "paid").length });
});

/**
 * POST /api/admin/bookings: "Booking manual", a stay agreed over WhatsApp or
 * the phone. Email optional; `paid` means the admin has the money, so it is
 * created confirmed and the guest gets the confirmation. An unpaid manual
 * booking opens no charge at DOKU and sends nothing: the admin follows up by
 * hand and marks it paid.
 */
export const POST = withAdmin(async (req) => {
  const body = await parseBody(req, manualBookingBody);
  if (!body) return json({ ok: false, error: "invalid" }, 400);
  const result = await createBooking({ ...body, method: body.method as PaymentMethodId, source: "admin" });
  if (!result.ok) return json(result, result.error === "invalid" ? 400 : 200);
  if (body.paid) await sendTemplates(result.booking.code, ["confirmed"]);
  const row = await db.booking.findUniqueOrThrow({ where: { code: result.booking.code }, include: bookingInclude });
  return json({ ok: true, booking: toBooking(row) });
});
