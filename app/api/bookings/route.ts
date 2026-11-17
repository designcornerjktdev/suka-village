import { createBooking } from "@/lib/server/bookings";
import { issueAccessToken } from "@/lib/server/access";
import { clientIp, json, parseBody, tooMany } from "@/lib/server/http";
import { guestView } from "@/lib/server/public";
import { LIMITS, rateLimit } from "@/lib/server/ratelimit";
import { createBookingBody } from "@/lib/server/schemas";

/**
 * POST /api/bookings: the guest presses "Bayar" (createBooking).
 * Always a website booking: source and paid sent by the browser are ignored.
 */
export async function POST(req: Request) {
  if (!(await rateLimit(`book:${clientIp(req)}`, LIMITS.createBooking))) return tooMany();
  const body = await parseBody(req, createBookingBody);
  if (!body) return json({ ok: false, error: "invalid" }, 400);
  const result = await createBooking({ ...body, source: "website", paid: false });
  if (!result.ok) return json(result, result.error === "invalid" ? 400 : 200);
  const token = await issueAccessToken(result.booking.code);
  return json({ ok: true, booking: guestView(result.booking), token });
}
