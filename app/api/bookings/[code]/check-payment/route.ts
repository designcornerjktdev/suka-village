import { findBooking, markPaidByGateway } from "@/lib/server/bookings";
import { verifyAccess } from "@/lib/server/access";
import { db } from "@/lib/server/db";
import { json, notFound, tokenOf } from "@/lib/server/http";
import { sendTemplates } from "@/lib/server/mail";
import { chargeStatus } from "@/lib/server/payments/charges";
import { guestView } from "@/lib/server/public";

/** POST /api/bookings/:code/check-payment?t=: "Saya sudah bayar" asks DOKU early (checkPayment). The webhook stays the truth. */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.trim().toUpperCase();
  if (!(await verifyAccess(code, tokenOf(req)))) return notFound();
  const booking = await findBooking(code);
  if (!booking) return notFound();
  if (booking.status === "pending") {
    const p = await db.payment.findUniqueOrThrow({ where: { bookingCode: code } });
    try {
      if ((await chargeStatus(p)) === "paid" && p.gatewayId) {
        const r = await markPaidByGateway(code, p.gatewayId, new Date());
        if (r.ok) await sendTemplates(code, r.templates);
      }
    } catch (e) {
      console.error(`[payments] status check for ${code} failed:`, e);
    }
  }
  return json(guestView((await findBooking(code)) ?? booking));
}
