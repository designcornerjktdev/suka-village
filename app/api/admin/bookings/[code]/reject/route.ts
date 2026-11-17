import { z } from "zod";
import { withAdmin } from "@/lib/server/admin-route";
import { answerTransition } from "@/lib/server/admin-bookings";
import { reject } from "@/lib/server/bookings";
import { json, parseBody } from "@/lib/server/http";

const body = z.object({ reason: z.string().max(1000).default("") });

/** POST /api/admin/bookings/:code/reject {reason}: only from paid; releases nights, flags the refund, emails `rejected`. */
export const POST = withAdmin<{ code: string }>(async (req, admin, { code }) => {
  const input = await parseBody(req, body);
  if (!input) return json({ ok: false, error: "invalid" }, 400);
  const c = code.trim().toUpperCase();
  return answerTransition(c, await reject(c, input.reason, admin.adminId));
});
