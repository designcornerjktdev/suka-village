import { withAdmin } from "@/lib/server/admin-route";
import { answerTransition } from "@/lib/server/admin-bookings";
import { confirm } from "@/lib/server/bookings";

/** POST /api/admin/bookings/:code/confirm: accept a paid booking (only from paid); emails `confirmed`. */
export const POST = withAdmin<{ code: string }>(async (_req, admin, { code }) => {
  const c = code.trim().toUpperCase();
  return answerTransition(c, await confirm(c, admin.adminId));
});
