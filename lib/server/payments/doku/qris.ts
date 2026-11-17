import { dokuRequest } from "./client";
import { dokuConfig } from "./config";
import { snapTimestamp } from "./snap";

/**
 * SNAP QRIS, merchant presented, dynamic: one QR per charge for the exact
 * amount, valid until the booking's payment hold ends. Same B2B token and
 * HMAC signature as the VA calls (DOKU QRIS integration guide).
 */

export const QRIS_PATHS = {
  generate: "/snap-adapter/b2b/v1.0/qr/qr-mpm-generate",
  query: "/snap-adapter/b2b/v1.0/qr/qr-mpm-query",
  expire: "/snap-adapter/b2b/v1.0/qr/qr-expire",
};

function qrisConfig() {
  const q = dokuConfig().qris;
  if (!q.merchantId || !q.terminalId) throw new Error("DOKU QRIS is not set up (DOKU_QRIS_MERCHANT_ID, DOKU_QRIS_TERMINAL_ID)");
  if (!/^\d{1,5}$/.test(q.postalCode)) throw new Error("DOKU_QRIS_POSTAL_CODE must be the property's postal code (digits)");
  return q;
}

export type QrisCharge = { trxId: string; amount: number; expiresAt: string };

/** reference = the QR string to draw; gatewayRef = DOKU's referenceNo, needed to query or expire it. */
export async function createQris(c: QrisCharge): Promise<{ reference: string; gatewayId: string; gatewayRef: string }> {
  const q = qrisConfig();
  const res = await dokuRequest<{ qrContent?: string; referenceNo?: string }>("POST", QRIS_PATHS.generate, {
    partnerReferenceNo: c.trxId,
    amount: { value: `${c.amount}.00`, currency: "IDR" },
    merchantId: q.merchantId,
    terminalId: q.terminalId,
    validityPeriod: snapTimestamp(new Date(c.expiresAt)),
    additionalInfo: { postalCode: q.postalCode, feeType: "1" },
  });
  if (!res.qrContent || !res.referenceNo) throw new Error(`DOKU qr-mpm-generate for ${c.trxId}: answer has no QR`);
  return { reference: res.qrContent, gatewayId: c.trxId, gatewayRef: res.referenceNo };
}

type Ids = { gatewayId: string; gatewayRef: string };

/** SNAP latestTransactionStatus "00" is a successful payment. */
export async function qrisStatus(ids: Ids): Promise<"paid" | "pending"> {
  const res = await dokuRequest<{ latestTransactionStatus?: string }>("POST", QRIS_PATHS.query, {
    originalReferenceNo: ids.gatewayRef,
    originalPartnerReferenceNo: ids.gatewayId,
    serviceCode: "47",
    merchantId: qrisConfig().merchantId,
  });
  return res.latestTransactionStatus === "00" ? "paid" : "pending";
}

/** Ends the QR now so it can no longer be paid. */
export async function expireQris(ids: Ids) {
  await dokuRequest("POST", QRIS_PATHS.expire, { partnerReferenceNo: ids.gatewayId, referenceNo: ids.gatewayRef, merchantId: qrisConfig().merchantId });
}
