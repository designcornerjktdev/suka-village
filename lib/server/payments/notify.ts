import { expireLapsed, markPaidByGateway } from "../bookings";
import { db } from "../db";
import { sendAdminAlert, sendTemplates } from "../mail";
import { closeCharge } from "./charges";
import { dokuConfig } from "./doku/config";
import { signNonSnap } from "./doku/nonsnap";
import { issueNotificationToken, sameSignature, verifyAsymmetric, verifyNotificationToken } from "./doku/snap";
import { runTx } from "../tx";

/**
 * DOKU → us. SNAP notifications come in two steps, as in DOKU's own library:
 *  1. DOKU asks us for a token, signing `clientId|timestamp` with ITS private
 *     key; we check it with DOKU's public key and issue a short-lived JWT
 *     signed with OUR private key.
 *  2. DOKU posts the payment with `Authorization: Bearer <that token>`; we
 *     accept it only if the token is ours and unexpired.
 */

export const NOTIFY_TOKEN_SECONDS = 900;

type Reply = { status: number; body: unknown };

export function handleTokenRequest(headers: Headers, now = new Date()): Reply {
  const c = dokuConfig();
  const clientId = headers.get("x-client-key") ?? "";
  const timestamp = headers.get("x-timestamp") ?? "";
  const signature = headers.get("x-signature") ?? "";
  const why = !c.privateKey
    ? "merchant private key missing (DOKU_PRIVATE_KEY / DOKU_PRIVATE_KEY_PATH; needed for SNAP)"
    : !c.dokuPublicKey
    ? "DOKU public key missing (DOKU_PUBLIC_KEY / DOKU_PUBLIC_KEY_PATH)"
    : clientId !== c.clientId
      ? `X-CLIENT-KEY does not match DOKU_CLIENT_ID (got ${clientId ? `${clientId.length} chars` : "none"})`
      : !verifyAsymmetric(c.dokuPublicKey, clientId, timestamp, signature)
        ? "signature does not verify against the DOKU public key"
        : null;
  if (why) {
    console.warn(`[payments] token request rejected: ${why}`);
    return { status: 401, body: { responseCode: "4017300", responseMessage: "Unauthorized. Signature" } };
  }
  console.info("[payments] token request accepted, token issued");
  return {
    status: 200,
    body: {
      responseCode: "2007300",
      responseMessage: "Successful",
      accessToken: issueNotificationToken(c.privateKey, c.clientId, NOTIFY_TOKEN_SECONDS, now),
      tokenType: "Bearer",
      expiresIn: NOTIFY_TOKEN_SECONDS,
      additionalInfo: "",
    },
  };
}

type VaNotification = {
  partnerServiceId?: string;
  customerNo?: string;
  virtualAccountNo?: string;
  virtualAccountName?: string;
  trxId?: string;
  paymentRequestId?: string;
  paidAmount?: { value?: string; currency?: string };
};

/** SNAP QRIS payment notification (service 52). */
type QrisNotification = {
  originalReferenceNo?: string;
  originalPartnerReferenceNo?: string;
  latestTransactionStatus?: string;
  amount?: { value?: string; currency?: string };
};

const fail = (status: number, code: string, message: string): Reply => ({ status, body: { responseCode: code, responseMessage: message } });

export async function handlePaymentNotification(headers: Headers, raw: string, now = new Date()): Promise<Reply> {
  const c = dokuConfig();
  const bearer = (headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  if (!c.merchantPublicKey || !verifyNotificationToken(c.merchantPublicKey, bearer, now)) {
    console.warn(`[payments] notification rejected: ${!c.merchantPublicKey ? "SNAP needs DOKU_PRIVATE_KEY, none set" : bearer ? "token invalid or expired" : "no Bearer token"}`);
    return fail(401, "4012501", "Invalid Token (B2B)");
  }

  let parsed: VaNotification & QrisNotification;
  try {
    parsed = JSON.parse(raw);
  } catch {
    console.warn("[payments] notification rejected: body is not JSON");
    return fail(400, "4002500", "Bad Request");
  }
  console.info(`[payments] notification received: ${parsed.originalPartnerReferenceNo ? `qris/ewallet ${parsed.originalPartnerReferenceNo}` : `va ${parsed.trxId ?? "(no trxId)"}`}`);

  /* QRIS (SNAP service 52) and e-wallet direct debit (service 56) share this shape. */
  if (parsed.originalPartnerReferenceNo) {
    const q = parsed;
    const charge = await db.payment.findFirst({ where: { gatewayId: q.originalPartnerReferenceNo }, select: { method: true } });
    const ok = { status: 200, body: { responseCode: charge?.method === "qris" ? "2005200" : "2005600", responseMessage: "Successful" } };
    /* Only a successful payment moves anything; other statuses are acknowledged. */
    if (q.latestTransactionStatus !== "00") return ok;
    const r = await settle(q.originalPartnerReferenceNo!, q.amount?.value, `qris:${q.originalPartnerReferenceNo}:${q.originalReferenceNo ?? ""}`, now);
    return r ?? ok;
  }

  const n = parsed;
  const r = await settle(n.trxId, n.paidAmount?.value, `va:${n.trxId}:${n.paymentRequestId ?? ""}`, now);
  if (r) return r;
  return {
    status: 200,
    body: {
      responseCode: "2002500",
      responseMessage: "Successful",
      virtualAccountData: {
        partnerServiceId: n.partnerServiceId,
        customerNo: n.customerNo,
        virtualAccountNo: n.virtualAccountNo,
        virtualAccountName: n.virtualAccountName,
        paymentRequestId: n.paymentRequestId,
        paidAmount: n.paidAmount,
      },
    },
  };
}

/**
 * Non-SNAP notification (cards): signed like a Non-SNAP request, with our
 * Secret Key and Request-Target = the path DOKU posted to. Body carries
 * order.invoice_number (our trxId), order.amount and transaction.status.
 */
export async function handleNonSnapNotification(headers: Headers, raw: string, path: string, now = new Date()): Promise<Reply> {
  const c = dokuConfig();
  const expected = signNonSnap(c.secretKey, {
    clientId: headers.get("client-id") ?? "",
    requestId: headers.get("request-id") ?? "",
    timestamp: headers.get("request-timestamp") ?? "",
    target: path,
    body: raw,
  });
  if (headers.get("client-id") !== c.clientId || !sameSignature(headers.get("signature") ?? "", expected)) {
    console.warn(`[payments] card notification rejected: ${headers.get("client-id") !== c.clientId ? "Client-Id does not match" : "signature does not match"}`);
    return { status: 401, body: { error: { code: "invalid_signature", message: "Invalid Signature" } } };
  }
  let n: { order?: { invoice_number?: string; amount?: number | string }; transaction?: { status?: string } };
  try {
    n = JSON.parse(raw);
  } catch {
    return { status: 400, body: { error: { code: "bad_request", message: "Bad Request" } } };
  }
  /* Only a successful payment moves anything; FAILED and the rest are acknowledged. */
  if (n.transaction?.status !== "SUCCESS") return { status: 200, body: {} };
  const r = await settle(n.order?.invoice_number, n.order?.amount === undefined ? undefined : String(n.order.amount), `card:${n.order?.invoice_number}`, now);
  return r ?? { status: 200, body: {} };
}

/** Non-SNAP notifications carry `Signature: HMACSHA256=...`; SNAP ones a Bearer token. */
export const isNonSnap = (headers: Headers) => (headers.get("signature") ?? "").startsWith("HMACSHA256=");

/**
 * A successful payment for our charge `trxId`: checks the amount, then marks
 * the booking paid (idempotent), or flags a refund if it is no longer a stay.
 * Returns an error reply, or null when the caller should answer success.
 */
async function settle(trxId: string | undefined, amount: string | undefined, eventId: string, now: Date): Promise<Reply | null> {
  let payment = trxId ? await db.payment.findFirst({ where: { gatewayId: trxId } }) : null;
  /* Not the booking's current charge: one it opened earlier, before the guest
     changed payment method (an e-wallet link or card page DOKU cannot close).
     The money is still this booking's. */
  const earlier = !payment && trxId ? await db.charge.findUnique({ where: { trxId } }) : null;
  if (earlier) payment = await db.payment.findUnique({ where: { bookingCode: earlier.bookingCode } });
  if (!payment) {
    console.warn(`[payments] notification for unknown charge ${trxId ?? "(no trxId)"}`);
    return fail(404, "4042512", "Bill not found");
  }
  const code = payment.bookingCode;

  const paid = Math.round(Number(amount ?? NaN));
  if (paid !== payment.amount) {
    console.warn(`[payments] amount mismatch for ${code}: got ${amount ?? "?"}, bill ${payment.amount}`);
    await db.bookingEvent.create({ data: { bookingCode: code, by: "gateway", event: `Pembayaran DOKU tidak sesuai: diterima ${amount ?? "?"}, tagihan ${payment.amount}`, at: now } });
    return fail(400, "4042513", "Invalid Amount");
  }

  /* Kept for the audit trail; the status change below is itself idempotent. */
  await db.webhookEvent.upsert({ where: { id: eventId }, create: { id: eventId }, update: {} });

  /* Settle lapsed holds first and on their own: inside the paid transition a
     refused change rolls back, and would leave a lapsed hold looking pending. */
  await runTx((tx) => expireLapsed(tx, now));
  const current = earlier ? { ...payment } : null;
  const r = await markPaidByGateway(code, trxId!, now);
  if (r.ok && earlier && current) {
    /* Paid with the earlier charge: record that method, and close the charge
       opened after it so the guest is not asked to pay twice. */
    await db.payment.update({ where: { bookingCode: code }, data: { method: earlier.method } });
    if (current.gatewayId !== trxId) await closeCharge(current);
  }
  console.info(`[payments] ${code} settle: ${r.ok ? "marked paid" : `not changed (${r.error})`}`);
  if (r.ok) {
    await sendTemplates(code, r.templates);
  } else if (r.error === "state") {
    /* Money arrived for a booking that is no longer a stay (expired, cancelled). */
    const b = await db.booking.findUniqueOrThrow({ where: { code } });
    if (!b.refundOwed) {
      await db.$transaction([
        db.booking.update({ where: { code }, data: { refundOwed: true } }),
        db.payment.update({ where: { bookingCode: code }, data: { status: "paid", paidAt: now } }),
        db.bookingEvent.create({ data: { bookingCode: code, by: "gateway", event: "Pembayaran masuk setelah pesanan berakhir, perlu refund", at: now } }),
      ]);
      /* Nothing in the admin screens shows an owed refund by itself: tell
         every admin now (once: refundOwed guards this branch). */
      const rupiah = `Rp ${payment.amount.toLocaleString("id-ID")}`;
      const reached = await sendAdminAlert(
        `Perlu refund: pembayaran masuk setelah pesanan ${code} berakhir`,
        [
          `Pesanan ${code} sudah berakhir (${b.status}), tetapi DOKU melaporkan pembayaran ${rupiah} untuknya.`,
          "",
          "Kamar tidak lagi ditahan untuk tamu ini. Mohon proses refund di dashboard DOKU dan hubungi tamu:",
          `${b.guestName}, ${b.guestEmail || "-"}, ${b.guestPhone}.`,
          "",
          "Detail pesanan ada di Admin, menu Booking.",
        ].join("\n"),
      );
      if (reached) await db.bookingEvent.create({ data: { bookingCode: code, by: "system", event: "Admin diberi tahu lewat email: perlu refund", at: now } });
    }
  }
  return null;
}
