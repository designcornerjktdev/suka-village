import { dokuRequest } from "./client";
import { snapTimestamp } from "./snap";

/**
 * SNAP e-wallet one-time payments without account binding (DOKU direct debit
 * "payment-host-to-host"): the guest is sent to the wallet's own page and
 * comes back to the order page. DANA and ShopeePay only: OVO in DOKU SNAP
 * needs the guest's OVO account bound first (phone, OTP, PIN), which the
 * booking flow has no screen for, and GoPay is not in DOKU's SNAP Direct API.
 */

export type EwalletMethod = "dana" | "shopeepay";

export const EWALLET_CHANNEL: Record<EwalletMethod, string> = {
  dana: "EMONEY_DANA_SNAP",
  shopeepay: "EMONEY_SHOPEE_PAY_SNAP",
};

export const isEwallet = (m: string): m is EwalletMethod => m in EWALLET_CHANNEL;

export const EWALLET_PATHS = {
  pay: "/direct-debit/core/v1/debit/payment-host-to-host",
  status: "/orders/v1.0/debit/status",
};

/** DOKU accepts a payment link valid for 24 hours at most. */
const MAX_VALID_MS = 24 * 60 * 60_000;

export type EwalletCharge = {
  trxId: string;
  method: EwalletMethod;
  amount: number;
  expiresAt: string;
  /** Where the wallet sends the guest back: their order page. */
  returnUrl: string;
  ip?: string;
  title: string;
};

/** reference = the wallet payment URL the guest opens; gatewayRef = DOKU's referenceNo. */
export async function createEwallet(c: EwalletCharge): Promise<{ reference: string; gatewayId: string; gatewayRef?: string }> {
  const until = Math.min(Date.parse(c.expiresAt), Date.now() + MAX_VALID_MS);
  const res = await dokuRequest<{ webRedirectUrl?: string; referenceNo?: string }>(
    "POST",
    EWALLET_PATHS.pay,
    {
      partnerReferenceNo: c.trxId,
      amount: { value: `${c.amount}.00`, currency: "IDR" },
      urlParam: [{ url: c.returnUrl, type: "PAY_RETURN", isDeepLink: "N" }],
      validUpTo: snapTimestamp(new Date(until)),
      pointOfInitiation: "mweb",
      additionalInfo: { channel: EWALLET_CHANNEL[c.method], orderTitle: c.title.slice(0, 64) },
    },
    { channelId: null, ip: c.ip },
  );
  if (!res.webRedirectUrl) throw new Error(`DOKU e-wallet payment for ${c.trxId}: answer has no payment URL`);
  return { reference: res.webRedirectUrl, gatewayId: c.trxId, ...(res.referenceNo ? { gatewayRef: res.referenceNo } : {}) };
}

/** SNAP latestTransactionStatus "00" is a successful payment. */
export async function ewalletStatus(p: { method: EwalletMethod; gatewayId: string; gatewayRef: string | null }): Promise<"paid" | "pending"> {
  const res = await dokuRequest<{ latestTransactionStatus?: string }>(
    "POST",
    EWALLET_PATHS.status,
    {
      originalPartnerReferenceNo: p.gatewayId,
      originalReferenceNo: p.gatewayRef ?? "",
      /* The service code of the payment being asked about (debit payment). */
      serviceCode: "54",
      additionalInfo: { channel: EWALLET_CHANNEL[p.method] },
    },
    { channelId: null },
  );
  return res.latestTransactionStatus === "00" ? "paid" : "pending";
}
