import { cancel, findBooking } from "@/lib/server/bookings";
import { verifyAccess } from "@/lib/server/access";
import { db } from "@/lib/server/db";
import { json, notFound, tokenOf } from "@/lib/server/http";
import { sendTemplates } from "@/lib/server/mail";
import { closeCharge } from "@/lib/server/payments/charges";
import { guestView } from "@/lib/server/public";

/** POST /api/bookings/:code/cancel?t=token: the guest cancels, only while unpaid (cancelBooking "guest"). */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.trim().toUpperCase();
  if (!(await verifyAccess(code, tokenOf(req)))) return notFound();
  const r = await cancel(code, "guest");
  if (!r.ok) return r.error === "not_found" ? notFound() : json({ ok: false, error: r.error }, 409);
  await closeCharge(await db.payment.findUniqueOrThrow({ where: { bookingCode: code } }));
  await sendTemplates(code, r.templates);
  return json(guestView((await findBooking(code)) ?? r.booking));
}
