import { z } from "zod";
import { withAdmin } from "@/lib/server/admin-route";
import { adminBooking } from "@/lib/server/admin-bookings";
import { db } from "@/lib/server/db";
import { json, notFound, parseBody } from "@/lib/server/http";
import { sendTemplates } from "@/lib/server/mail";

const body = z.object({ template: z.enum(["awaiting_payment", "payment_received", "confirmed", "rejected", "expired", "cancelled", "reminder"]) });

/** POST /api/admin/bookings/:code/notify {template}: "Kirim ulang email" (resendNotification). */
export const POST = withAdmin<{ code: string }>(async (req, admin, { code }) => {
  const input = await parseBody(req, body);
  if (!input) return json({ ok: false, error: "invalid" }, 400);
  const c = code.trim().toUpperCase();
  if (!(await adminBooking(c))) return notFound();
  await sendTemplates(c, [input.template]);
  await db.bookingEvent.create({ data: { bookingCode: c, by: "admin", adminId: admin.adminId, event: "Email dikirim ulang" } });
  return json(await adminBooking(c));
});
