import { z } from "zod";
import { withAdmin } from "@/lib/server/admin-route";
import { answerTransition } from "@/lib/server/admin-bookings";
import { cancel } from "@/lib/server/bookings";
import { db } from "@/lib/server/db";
import { json, parseBody } from "@/lib/server/http";
import { closeCharge } from "@/lib/server/payments/charges";

const body = z.object({ reason: z.string().max(1000).optional() });

/** POST /api/admin/bookings/:code/cancel {reason}: until arrival; a paid one is flagged for refund. Closes any open charge. */
export const POST = withAdmin<{ code: string }>(async (req, admin, { code }) => {
  const input = await parseBody(req, body);
  if (!input) return json({ ok: false, error: "invalid" }, 400);
  const c = code.trim().toUpperCase();
  const r = await cancel(c, "admin", input.reason, admin.adminId);
  if (r.ok) {
    const p = await db.payment.findUnique({ where: { bookingCode: c } });
    if (p && p.status !== "paid") await closeCharge(p);
  }
  return answerTransition(c, r);
});
