import { randomInt } from "node:crypto";
import { dokuRequest } from "./client";
import { dokuConfig } from "./config";
import { snapTimestamp } from "./snap";

/**
 * SNAP virtual accounts (BCA, BNI, BRI, Mandiri). The number is made by DOKU
 * (DGPC) from the partner service id in the DOKU dashboard (left padded to 8)
 * (see createVa). Closed amount (trx type "C"), single use, and it
 * expires with the booking's payment hold.
 */

export type VaMethod = "va_bca" | "va_bni" | "va_bri" | "va_mandiri";

export const VA_CHANNEL: Record<VaMethod, string> = {
  va_bca: "VIRTUAL_ACCOUNT_BCA",
  va_bni: "VIRTUAL_ACCOUNT_BNI",
  va_bri: "VIRTUAL_ACCOUNT_BRI",
  va_mandiri: "VIRTUAL_ACCOUNT_BANK_MANDIRI",
};

export const isVa = (m: string): m is VaMethod => m in VA_CHANNEL;

export const VA_PATHS = {
  create: "/virtual-accounts/bi-snap-va/v1.1/transfer-va/create-va",
  delete: "/virtual-accounts/bi-snap-va/v1.1/transfer-va/delete-va",
};

/** The bank's Merchant BIN (DOKU_VA_<BANK>), sent as partnerServiceId. */
function prefixFor(method: VaMethod) {
  const bin = dokuConfig().va[method].partnerServiceId;
  if (!bin) throw new Error(`DOKU VA for ${method} is not set up (DOKU_VA_${method.slice(3).toUpperCase()}: the Merchant BIN)`);
  return bin;
}

/** DOKU accepts a customerNo of exactly 10 digits (11 is refused). */
const CUSTOMER_NO_LENGTH = 10;

/** Only the characters DOKU accepts in a VA name. */
const vaName = (name: string) =>
  name
    .replace(/[^a-zA-Z0-9.\-/+,=_:'@% ]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 255) || "Tamu Suka Village";

export type VaCharge = {
  trxId: string;
  method: VaMethod;
  amount: number;
  expiresAt: string;
  guest: { name: string; email: string; phone: string };
};

/**
 * DGPC (DOKU Generated Payment Code), as the account is set up. Checked
 * against the sandbox on 18 Nov 2026: partnerServiceId is the Merchant BIN
 * (left padded to 8), customerNo any 10 digits, virtualAccountNo the two
 * together; anything else is refused (4032701 / 4032715). DOKU then makes ITS
 * OWN number and returns it; that returned number is what the guest pays and
 * what delete and status calls use.
 */
export async function createVa(c: VaCharge): Promise<{ reference: string; gatewayId: string }> {
  const partnerServiceId = prefixFor(c.method).padStart(8, " ");
  const customerNo = String(randomInt(0, 10 ** CUSTOMER_NO_LENGTH)).padStart(CUSTOMER_NO_LENGTH, "0");
  const res = await dokuRequest<{ virtualAccountData?: { virtualAccountNo?: string } }>("POST", VA_PATHS.create, {
    partnerServiceId,
    customerNo,
    virtualAccountNo: `${partnerServiceId}${customerNo}`,
    virtualAccountName: vaName(c.guest.name),
    virtualAccountEmail: c.guest.email,
    virtualAccountPhone: c.guest.phone.replace(/^\+/, ""),
    trxId: c.trxId,
    totalAmount: { value: `${c.amount}.00`, currency: "IDR" },
    additionalInfo: { channel: VA_CHANNEL[c.method], virtualAccountConfig: { reusableStatus: false } },
    virtualAccountTrxType: "C",
    expiredDate: snapTimestamp(new Date(c.expiresAt)),
  });
  const number = res.virtualAccountData?.virtualAccountNo?.trim();
  if (!number) throw new Error(`DOKU create-va for ${c.trxId}: answer has no VA number`);
  return { reference: number, gatewayId: c.trxId };
}

export const VA_STATUS_PATH = "/orders/v1.0/transfer-va/status";

/**
 * Asks DOKU whether a VA has been paid. SNAP paymentFlagStatus "00" is paid.
 * The webhook stays the source of truth; this only lets "Saya sudah bayar"
 * answer before the webhook lands.
 */
export async function vaStatus(v: { method: VaMethod; reference: string }): Promise<"paid" | "pending"> {
  const prefix = prefixFor(v.method);
  const partnerServiceId = prefix.padStart(8, " ");
  const res = await dokuRequest<{ virtualAccountData?: { paymentFlagStatus?: string } }>("POST", VA_STATUS_PATH, {
    partnerServiceId,
    customerNo: v.reference.slice(prefix.length),
    virtualAccountNo: `${partnerServiceId}${v.reference.slice(prefix.length)}`,
    inquiryRequestId: null,
    paymentRequestId: null,
    additionalInfo: {},
  });
  return res.virtualAccountData?.paymentFlagStatus === "00" ? "paid" : "pending";
}

/** Closes a VA so it can no longer be paid. */
export async function deleteVa(v: { method: VaMethod; reference: string; trxId: string }) {
  const prefix = prefixFor(v.method);
  const partnerServiceId = prefix.padStart(8, " ");
  await dokuRequest("DELETE", VA_PATHS.delete, {
    partnerServiceId,
    customerNo: v.reference.slice(prefix.length),
    virtualAccountNo: `${partnerServiceId}${v.reference.slice(prefix.length)}`,
    trxId: v.trxId,
    additionalInfo: { channel: VA_CHANNEL[v.method] },
  });
}
