import { randomBytes } from "node:crypto";
import type { PaymentMethodId } from "@/lib/booking/types";
import { db } from "../db";
import { siteOrigin } from "../mail";
import { cardStatus, createCardPage } from "./doku/card";
import { createEwallet, ewalletStatus, isEwallet } from "./doku/ewallet";
import { createQris, expireQris, qrisStatus } from "./doku/qris";
import { createVa, deleteVa, isVa, vaStatus } from "./doku/va";

/**
 * The payment step of a booking, whatever the method. Opening a charge happens
 * AFTER the booking transaction commits, so a slow gateway never holds a lock.
 *
 * Methods: virtual accounts (BCA, BNI, BRI, Mandiri), QRIS, the e-wallets
 * DANA and ShopeePay (SNAP), and cards (Non-SNAP hosted page). OVO and GoPay
 * are not offered (see doku/ewallet.ts); they are refused up front.
 */

export class UnsupportedMethod extends Error {
  constructor(method: string) {
    super(`Payment method ${method} is not available yet`);
    this.name = "UnsupportedMethod";
  }
}

export const supportsMethod = (m: PaymentMethodId) => isVa(m) || m === "qris" || isEwallet(m) || m === "card";

/** One trxId per charge: changing method opens a new charge with a new id. */
const newTrxId = (code: string) => `${code}-${randomBytes(4).toString("hex")}`;

type OpenPayment = { method: string; reference: string; gatewayId: string | null; gatewayRef: string | null };

/** Opens the charge for a pending booking and stores what the guest pays with.
    `ip` is the guest's address (e-wallets ask for it). */
export async function openCharge(code: string, opts: { ip?: string } = {}) {
  const b = await db.booking.findUniqueOrThrow({ where: { code }, include: { payment: true } });
  const p = b.payment!;
  const base = { trxId: newTrxId(code), amount: p.amount, expiresAt: p.expiresAt.toISOString() };
  let opened: { reference: string; gatewayId: string; gatewayRef?: string };
  if (isVa(p.method)) {
    opened = await createVa({ ...base, method: p.method, guest: { name: b.guestName, email: b.guestEmail, phone: b.guestPhone } });
  } else if (p.method === "qris") {
    opened = await createQris(base);
  } else if (isEwallet(p.method)) {
    /* The wallet returns the guest to their order page; it keeps the access
       token in the browser, so the token is not put in a URL given to DOKU. */
    opened = await createEwallet({ ...base, method: p.method, returnUrl: `${siteOrigin()}/${b.locale}/booking/${code}`, ip: opts.ip, title: `Suka Village ${code}` });
  } else if (p.method === "card") {
    opened = await createCardPage({ ...base, code, locale: b.locale === "en" ? "en" : "id", returnUrl: `${siteOrigin()}/${b.locale}/booking/${code}`, guest: { name: b.guestName, email: b.guestEmail, phone: b.guestPhone } });
  } else {
    throw new UnsupportedMethod(p.method);
  }
  await db.payment.update({ where: { bookingCode: code }, data: { reference: opened.reference, gatewayId: opened.gatewayId, gatewayRef: opened.gatewayRef ?? null } });
}

/** Closes an open charge (method changed, booking cancelled). Never throws: an open charge expires on its own. */
export async function closeCharge(p: OpenPayment) {
  if (!p.gatewayId || !p.reference) return;
  try {
    if (isVa(p.method)) await deleteVa({ method: p.method, reference: p.reference, trxId: p.gatewayId });
    else if (p.method === "qris" && p.gatewayRef) await expireQris({ gatewayId: p.gatewayId, gatewayRef: p.gatewayRef });
  } catch (e) {
    console.error(`[payments] closing ${p.gatewayId} failed:`, e);
  }
}

export async function chargeStatus(p: OpenPayment): Promise<"paid" | "pending"> {
  if (isVa(p.method) && p.reference) return vaStatus({ method: p.method, reference: p.reference });
  if (p.method === "qris" && p.gatewayId && p.gatewayRef) return qrisStatus({ gatewayId: p.gatewayId, gatewayRef: p.gatewayRef });
  if (isEwallet(p.method) && p.gatewayId) return ewalletStatus({ method: p.method, gatewayId: p.gatewayId, gatewayRef: p.gatewayRef });
  if (p.method === "card" && p.gatewayId) return cardStatus(p.gatewayId);
  return "pending";
}
