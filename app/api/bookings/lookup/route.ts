import { findBooking } from "@/lib/server/bookings";
import { issueAccessToken } from "@/lib/server/access";
import { clientIp, json, notFound, parseBody, tooMany } from "@/lib/server/http";
import { guestView } from "@/lib/server/public";
import { LIMITS, rateLimit } from "@/lib/server/ratelimit";
import { lookupBody } from "@/lib/server/schemas";

/** POST /api/bookings/lookup {code, email}: "Cek pesanan" (findBooking). The same answer whether or not the code exists. */
export async function POST(req: Request) {
  if (!(await rateLimit(`lookup:${clientIp(req)}`, LIMITS.lookup))) return tooMany();
  const body = await parseBody(req, lookupBody);
  if (!body) return notFound();
  const booking = await findBooking(body.code);
  if (!booking || !booking.guest.email || booking.guest.email.toLowerCase() !== body.email.trim().toLowerCase()) return notFound();
  return json({ booking: guestView(booking), token: await issueAccessToken(booking.code) });
}
