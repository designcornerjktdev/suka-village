import type { PaymentGroup, PaymentMethodId } from "./types";

/**
 * Payment methods the guest can choose, as an Indonesian payment gateway
 * (Xendit, Midtrans) offers them.
 *
 * Logos in public/payments/, shown only to say which methods are accepted:
 *   bca, bni, bri, mandiri, qris, gopay, ovo, dana
 *       Wikimedia Commons, public domain / CC0 as files (the marks remain
 *       trademarks of their owners). Pages: "Bank Central Asia.svg",
 *       "Bank Negara Indonesia logo (2004).svg", "BRI 2020.svg",
 *       "Bank Mandiri logo 2016.svg", "QRIS Logo.svg", "GoPay logo.svg",
 *       "Logo ovo purple.svg", "Logo dana blue.svg".
 *   visa       Simple Icons (CC0), filled in Visa blue.
 *   mastercard drawn here from the brand's circles and colours.
 *
 * ShopeePay has no freely licensed logo anywhere we could find, so it shows as
 * text. The gateway's merchant kit has the official file (REPLACE.md #26).
 * The package idn-finlogos was considered and rejected: its logos are
 * CC BY-NC, non-commercial only.
 *
 * `manual` is admin-only: a booking taken over WhatsApp and paid by transfer
 * or cash, marked paid by hand.
 */
export type MethodInfo = { id: PaymentMethodId; group: PaymentGroup; label: string; bank?: string; logos: string[] };

const logo = (name: string) => `/payments/${name}.svg`;

export const METHODS: MethodInfo[] = [
  { id: "qris", group: "qris", label: "QRIS", logos: [logo("qris")] },
  { id: "va_bca", group: "va", label: "BCA Virtual Account", bank: "BCA", logos: [logo("bca")] },
  { id: "va_bni", group: "va", label: "BNI Virtual Account", bank: "BNI", logos: [logo("bni")] },
  { id: "va_bri", group: "va", label: "BRI Virtual Account", bank: "BRI", logos: [logo("bri")] },
  { id: "va_mandiri", group: "va", label: "Mandiri Virtual Account", bank: "Mandiri", logos: [logo("mandiri")] },
  { id: "gopay", group: "ewallet", label: "GoPay", logos: [logo("gopay")] },
  { id: "ovo", group: "ewallet", label: "OVO", logos: [logo("ovo")] },
  { id: "dana", group: "ewallet", label: "DANA", logos: [logo("dana")] },
  { id: "shopeepay", group: "ewallet", label: "ShopeePay", logos: [] },
  { id: "card", group: "card", label: "Kartu kredit / debit", logos: [logo("visa"), logo("mastercard")] },
  { id: "manual", group: "manual", label: "Transfer manual / tunai", logos: [] },
];

export const GUEST_GROUPS: PaymentGroup[] = ["qris", "va", "ewallet", "card"];

export const methodInfo = (id: PaymentMethodId) => METHODS.find((m) => m.id === id) ?? METHODS[0];

/**
 * What the guest pays WITH. In production the gateway returns this when the
 * charge is created; here it is made up, and the order page labels it so.
 */
export function mockReference(method: PaymentMethodId, code: string) {
  const digits = (n: number) =>
    Array.from(crypto.getRandomValues(new Uint8Array(n)), (b) => String(b % 10)).join("");
  const info = methodInfo(method);
  switch (info.group) {
    case "va":
      return `8808${digits(12)}`;
    case "qris":
      return `00020101021226DEMO${code.replace("-", "")}${digits(8)}`;
    case "ewallet":
      return `https://example.com/pay/${info.id}/${code}`;
    case "card":
      return `https://example.com/checkout/${code}`;
    default:
      return "";
  }
}
