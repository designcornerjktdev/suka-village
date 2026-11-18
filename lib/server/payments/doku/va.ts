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

/**
 * DOKU accepts at most 15 digits for BIN + customerNo (sandbox, 19 Nov 2026:
 * BNI BIN 84923 + 10 digits passes, BRI BIN 139256 + 10 is refused with
 * 4032715, + 9 passes). So the customerNo gets what the BIN leaves.
 */
const VA_DIGITS = 15;
export const customerNoLength = (bin: string) => VA_DIGITS - bin.length;

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
 * (left padded to 8), customerNo random digits up to 15 in all
 * (customerNoLength), virtualAccountNo the two together; anything else is
 * refused (4032701 / 4032715). DOKU then makes ITS OWN number and returns it;
 * that returned number is what the guest pays and what delete and status calls use.
 */
export async function createVa(c: VaCharge): Promise<{ reference: string; gatewayId: string }> {
  const bin = prefixFor(c.method);
  const partnerServiceId = bin.padStart(8, " ");
  const length = customerNoLength(bin);
  const customerNo = String(randomInt(0, 10 ** length)).padStart(length, "0");
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
  console.info(`[payments] VA created ${number} for trxId ${c.trxId}`);
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
  const res = await dokuRequest<{
    virtualAccountData?: {
      paymentFlagStatus?: string;
      paymentFlagReason?: { english?: string };
      paidAmount?: { value?: string };
    };
  }>("POST", VA_STATUS_PATH, {
    partnerServiceId,
    customerNo: v.reference.slice(prefix.length),
    virtualAccountNo: `${partnerServiceId}${v.reference.slice(prefix.length)}`,
    inquiryRequestId: null,
    paymentRequestId: null,
    additionalInfo: {},
  });
  /* SNAP spec says paymentFlagStatus "00"; DOKU (sandbox, 18 Nov 2026) omits
     it and answers paymentFlagReason "Success" with the paid amount instead. */
  const d = res.virtualAccountData;
  const paid = d?.paymentFlagStatus === "00" || (d?.paymentFlagReason?.english?.toLowerCase() === "success" && Number(d.paidAmount?.value ?? 0) > 0);
  console.info(`[payments] VA status ${v.reference}: ${paid ? "paid" : "pending"}`);
  return paid ? "paid" : "pending";
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
