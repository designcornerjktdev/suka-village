import { z } from "zod";
import { withAdmin } from "@/lib/server/admin-route";
import { answerTransition } from "@/lib/server/admin-bookings";
import { checkIn, checkOut } from "@/lib/server/bookings";
import { json, parseBody } from "@/lib/server/http";
import { jakartaToday } from "@/lib/server/time";

const body = z.object({ status: z.enum(["checked_in", "completed"]) });

/** PATCH /api/admin/bookings/:code/status {status}: check-in (from the arrival day) or check-out (setBookingStatus). */
export const PATCH = withAdmin<{ code: string }>(async (req, admin, { code }) => {
  const input = await parseBody(req, body);
  if (!input) return json({ ok: false, error: "invalid" }, 400);
  const c = code.trim().toUpperCase();
  return answerTransition(c, input.status === "checked_in" ? await checkIn(c, admin.adminId, jakartaToday()) : await checkOut(c, admin.adminId));
});
