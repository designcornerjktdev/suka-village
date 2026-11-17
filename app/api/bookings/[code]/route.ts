import { findBooking } from "@/lib/server/bookings";
import { verifyAccess } from "@/lib/server/access";
import { json, notFound, tokenOf } from "@/lib/server/http";
import { guestView } from "@/lib/server/public";

/** GET /api/bookings/:code?t=token: the order page (getBooking, useBooking). */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.trim().toUpperCase();
  if (!(await verifyAccess(code, tokenOf(req)))) return notFound();
  const booking = await findBooking(code);
  return booking ? json(guestView(booking)) : notFound();
}
