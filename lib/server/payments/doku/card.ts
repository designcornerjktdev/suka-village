import { nonSnapRequest } from "./nonsnap";

/**
 * Cards through DOKU's hosted Credit Card Payment Page (Non-SNAP): the guest
 * types their card on DOKU's page, never on this site (docs/BOOKING.md §3). The
 * page link is valid for one hour; the booking's hold decides the rest.
 */

export const CARD_PATHS = { page: "/credit-card/v1/payment-page", status: (invoice: string) => `/orders/v1/status/${encodeURIComponent(invoice)}` };

export type CardCharge = {
  trxId: string;
  code: string;
  amount: number;
  locale: "id" | "en";
  /** Where DOKU sends the guest after paying (or failing): their order page. */
  returnUrl: string;
  guest: { name: string; email: string; phone: string };
};

export async function createCardPage(c: CardCharge): Promise<{ reference: string; gatewayId: string }> {
  /* The sandbox answers with the page URL at the top level (checked 17 Nov 2026). */
  const res = await nonSnapRequest<{ credit_card_payment_page?: { url?: string } }>("POST", CARD_PATHS.page, {
    order: {
      invoice_number: c.trxId,
      amount: c.amount,
      /* DOKU checks that the lines add up to the amount: one line, the stay. */
      line_items: [{ name: `Suka Village ${c.code}`, price: c.amount, quantity: 1 }],
      callback_url: c.returnUrl,
      failed_url: c.returnUrl,
      auto_redirect: true,
    },
    customer: { id: c.code, name: c.guest.name.slice(0, 255), email: c.guest.email, phone: c.guest.phone.replace(/^\+/, ""), country: "ID" },
    payment: { type: "SALE" },
    override_configuration: { themes: { language: c.locale === "en" ? "EN" : "ID" } },
  });
  const url = res.credit_card_payment_page?.url;
  if (!url) throw new Error(`DOKU card payment page for ${c.trxId}: answer has no URL`);
  return { reference: url, gatewayId: c.trxId };
}

/** Non-SNAP order status: transaction.status SUCCESS is paid. */
export async function cardStatus(invoice: string): Promise<"paid" | "pending"> {
  const res = await nonSnapRequest<{ transaction?: { status?: string } }>("GET", CARD_PATHS.status(invoice));
  return res.transaction?.status === "SUCCESS" ? "paid" : "pending";
}
