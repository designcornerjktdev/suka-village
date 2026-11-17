import { z } from "zod";
import { withAdmin } from "@/lib/server/admin-route";
import { answerTransition } from "@/lib/server/admin-bookings";
import { markPaidManually } from "@/lib/server/bookings";
import { db } from "@/lib/server/db";
import { json, parseBody } from "@/lib/server/http";
import { closeCharge } from "@/lib/server/payments/charges";

const body = z.object({ note: z.string().max(500).default("") });

/**
 * POST /api/admin/bookings/:code/mark-paid {note}: transfer or cash outside
 * DOKU; pays AND confirms. The charge still open at DOKU is closed so the
 * guest cannot pay twice.
 */
export const POST = withAdmin<{ code: string }>(async (req, admin, { code }) => {
  const input = await parseBody(req, body);
  if (!input) return json({ ok: false, error: "invalid" }, 400);
  const c = code.trim().toUpperCase();
  const open = await db.payment.findUnique({ where: { bookingCode: c } });
  const r = await markPaidManually(c, input.note, admin.adminId);
  if (r.ok && open) await closeCharge(open);
  return answerTransition(c, r);
});
