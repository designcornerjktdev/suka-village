import { json } from "@/lib/server/http";
import { handleNonSnapNotification, handlePaymentNotification, isNonSnap } from "@/lib/server/payments/notify";
import { traceDokuRequest } from "@/lib/server/payments/trace";

/**
 * POST /api/webhooks/doku (the Notification URL set in the DOKU dashboard).
 * Any sub-path is accepted too, since SNAP may append its own
 * (e.g. /v1.1/transfer-va/payment). SNAP notifications (VA, QRIS, e-wallet)
 * come with our Bearer token; Non-SNAP ones (cards) with an HMAC Signature.
 */
export async function POST(req: Request) {
  traceDokuRequest("webhook in", req);
  const raw = await req.text();
  const r = isNonSnap(req.headers)
    ? await handleNonSnapNotification(req.headers, raw, new URL(req.url).pathname)
    : await handlePaymentNotification(req.headers, raw);
  console.info(`[payments] webhook answered ${r.status} ${(r.body as { responseCode?: string })?.responseCode ?? ""}`);
  return json(r.body, r.status);
}
