import type { PaymentMethodId } from "@/lib/booking/types";
import { cancel, createBooking, findBooking, readSettings } from "@/lib/server/bookings";
import { issueAccessToken } from "@/lib/server/access";
import { clientIp, json, parseBody, tooMany } from "@/lib/server/http";
import { sendTemplates } from "@/lib/server/mail";
import { openCharge, supportsMethod } from "@/lib/server/payments/charges";
import { guestView } from "@/lib/server/public";
import { LIMITS, rateLimit } from "@/lib/server/ratelimit";
import { createBookingBody } from "@/lib/server/schemas";

/**
 * POST /api/bookings: the guest presses "Bayar" (createBooking).
 * Always a website booking: source and paid sent by the browser are ignored.
 *
 * 1. the booking and its nights, in one transaction;
 * 2. the charge at DOKU (VA number etc.), after commit; if DOKU refuses, the
 *    booking is cancelled at once so its nights are free again;
 * 3. the `awaiting_payment` email with the payment instructions.
 */
export async function POST(req: Request) {
  if (!(await rateLimit(`book:${clientIp(req)}`, LIMITS.createBooking))) return tooMany();
  const body = await parseBody(req, createBookingBody);
  if (!body) return json({ ok: false, error: "invalid" }, 400);

  const method = body.method as PaymentMethodId;
  const settings = await readSettings();
  if (method === "manual" || !settings.methods[method] || !supportsMethod(method)) return json({ ok: false, error: "payment" });

  const result = await createBooking({ ...body, source: "website", paid: false });
  if (!result.ok) return json(result, result.error === "invalid" ? 400 : 200);
  const code = result.booking.code;

  try {
    await openCharge(code, { ip: clientIp(req) });
  } catch (e) {
    console.error(`[payments] opening the charge for ${code} failed:`, e);
    await cancel(code, "system", "Pembayaran tidak dapat dibuat");
    return json({ ok: false, error: "payment" });
  }

  await sendTemplates(code, ["awaiting_payment"]);
  const token = await issueAccessToken(code);
  return json({ ok: true, booking: guestView((await findBooking(code)) ?? result.booking), token });
}
