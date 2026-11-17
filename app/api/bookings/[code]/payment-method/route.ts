import { z } from "zod";
import type { PaymentMethodId } from "@/lib/booking/types";
import { expireLapsed, findBooking, readSettings } from "@/lib/server/bookings";
import { verifyAccess } from "@/lib/server/access";
import { db } from "@/lib/server/db";
import { clientIp, json, notFound, parseBody, tokenOf } from "@/lib/server/http";
import { closeCharge, openCharge, supportsMethod } from "@/lib/server/payments/charges";
import { guestView } from "@/lib/server/public";
import { runTx } from "@/lib/server/tx";

const body = z.object({ method: z.string() });

/**
 * POST /api/bookings/:code/payment-method?t= {method} (changePaymentMethod).
 * Only while unpaid: closes the old charge and opens a new one. The payment
 * deadline stays the original one.
 */
export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  const code = (await params).code.trim().toUpperCase();
  if (!(await verifyAccess(code, tokenOf(req)))) return notFound();
  const input = await parseBody(req, body);
  const method = input?.method as PaymentMethodId | undefined;
  const settings = await readSettings();
  if (!method || method === "manual" || !settings.methods[method] || !supportsMethod(method)) return json({ ok: false, error: "payment" }, 400);

  await runTx((tx) => expireLapsed(tx, new Date()));
  const booking = await findBooking(code);
  if (!booking) return notFound();
  if (booking.status !== "pending") return json({ ok: false, error: "state" }, 409);

  const old = await db.payment.findUniqueOrThrow({ where: { bookingCode: code } });
  await db.$transaction([
    db.payment.update({ where: { bookingCode: code }, data: { method, reference: "", gatewayId: null, gatewayRef: null } }),
    db.bookingEvent.create({ data: { bookingCode: code, by: "guest", event: "Cara bayar diganti" } }),
  ]);
  await closeCharge(old);
  try {
    await openCharge(code, { ip: clientIp(req) });
  } catch (e) {
    console.error(`[payments] new charge for ${code} failed:`, e);
    return json({ ok: false, error: "payment" }, 502);
  }
  return json(guestView((await findBooking(code))!));
}
