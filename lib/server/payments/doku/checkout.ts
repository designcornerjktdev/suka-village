import { isCheckoutLink } from "@/lib/booking/payments";
import { nonSnapRequest } from "./nonsnap";
import { VA_CHANNEL, type VaMethod } from "./va";

/**
 * Virtual accounts, QRIS and e-wallets through DOKU Checkout (Non-SNAP) instead of SNAP,
 * switched on with DOKU_VA_CHECKOUT=1, DOKU_QRIS_CHECKOUT=1 and DOKU_EWALLET_CHECKOUT=1. Why: in Nov
 * 2026 the sandbox account sent no SNAP notifications at all, while Non-SNAP
 * ones (Checkout, cards) arrived; DOKU documents Non-SNAP VA only through
 * Checkout; and SNAP QRIS needs a merchant and terminal id DOKU has not given
 * yet, which Checkout does not.
 *
 * The guest still picks the bank, QRIS or wallet on our site; the Checkout page is
 * opened for that one method only, so DOKU shows the number or the code
 * straight away. The stored reference is the page URL (the order page opens it
 * as DOKU's pop-up), and notification and status are the Non-SNAP ones the
 * card already uses (order.invoice_number = our trxId).
 */
export const vaViaCheckout = () => process.env.DOKU_VA_CHECKOUT === "1";
export const qrisViaCheckout = () => process.env.DOKU_QRIS_CHECKOUT === "1";
/** E-wallets too, OVO included: through Checkout OVO needs no account binding (SNAP did). GoPay is refused by Checkout as well. */
export const ewalletViaCheckout = () => process.env.DOKU_EWALLET_CHECKOUT === "1";

export type CheckoutEwallet = "dana" | "shopeepay" | "ovo";
const EWALLET_CHECKOUT_CHANNEL: Record<CheckoutEwallet, string> = { dana: "EMONEY_DANA", shopeepay: "EMONEY_SHOPEE_PAY", ovo: "EMONEY_OVO" };
export const isCheckoutEwallet = (m: string): m is CheckoutEwallet => m in EWALLET_CHECKOUT_CHANNEL;

/** A charge opened through Checkout stores the page URL (see isCheckoutLink). */
export const isCheckoutReference = isCheckoutLink;

export type CheckoutMethod = VaMethod | "qris" | CheckoutEwallet;

const CHECKOUT_CHANNEL = (m: CheckoutMethod) => (m === "qris" ? "QRIS" : isCheckoutEwallet(m) ? EWALLET_CHECKOUT_CHANNEL[m] : VA_CHANNEL[m]);

export async function createCheckout(c: {
  trxId: string;
  method: CheckoutMethod;
  code: string;
  amount: number;
  /** Minutes the Checkout page and its VA or QR stay payable. */
  minutes: number;
  returnUrl: string;
  guest: { name: string; email: string; phone: string };
}): Promise<{ reference: string; gatewayId: string }> {
  const res = await nonSnapRequest<{ response?: { payment?: { url?: string } }; payment?: { url?: string } }>("POST", "/checkout/v1/payment", {
    order: {
      invoice_number: c.trxId,
      amount: c.amount,
      line_items: [{ name: `Suka Village ${c.code}`, price: c.amount, quantity: 1 }],
      callback_url: c.returnUrl,
      auto_redirect: true,
    },
    payment: { payment_due_date: c.minutes, type: "SALE", payment_method_types: [CHECKOUT_CHANNEL(c.method)] },
    customer: { id: c.code, name: c.guest.name.slice(0, 255), email: c.guest.email, phone: c.guest.phone.replace(/^\+/, ""), country: "ID" },
  });
  const url = res.response?.payment?.url ?? res.payment?.url;
  if (!url) throw new Error(`DOKU checkout for ${c.trxId}: answer has no URL`);
  console.info(`[payments] ${c.method} via Checkout (Non-SNAP) for trxId ${c.trxId}: ${url}`);
  return { reference: url, gatewayId: c.trxId };
}
