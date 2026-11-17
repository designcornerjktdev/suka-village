import { generateKeyPairSync } from "node:crypto";
import { vi } from "vitest";
import { signAsymmetric, signSymmetric, snapTimestamp, verifyAsymmetric } from "@/lib/server/payments/doku/snap";
import { resetDokuClient } from "@/lib/server/payments/doku/client";
import { signNonSnap } from "@/lib/server/payments/doku/nonsnap";

/**
 * A stand-in for DOKU's sandbox in tests. It replaces global fetch and CHECKS
 * our signatures the way DOKU does (RSA with the merchant public key for the
 * token, HMAC-SHA512 with the secret for transactions), so a signing mistake
 * fails the test instead of passing silently.
 */

const pair = () => generateKeyPairSync("rsa", { modulusLength: 2048, publicKeyEncoding: { type: "spki", format: "pem" }, privateKeyEncoding: { type: "pkcs8", format: "pem" } });

export const merchantKeys = pair();
/** DOKU's own key pair: it signs its token request to us with the private half. */
export const dokuKeys = pair();

export const DOKU_ENV = {
  DOKU_CLIENT_ID: "BRN-TEST-0001",
  DOKU_SECRET_KEY: "SK-test-secret",
  DOKU_PRIVATE_KEY: merchantKeys.privateKey,
  DOKU_PUBLIC_KEY: dokuKeys.publicKey,
  DOKU_ENV: "sandbox",
  DOKU_VA_BCA: "19008",
  DOKU_VA_BCA_CUSTOMER_PREFIX: "1900",
  DOKU_VA_BNI: "84923",
  DOKU_VA_BNI_CUSTOMER_PREFIX: "8492",
  DOKU_VA_BRI: "13925",
  DOKU_VA_BRI_CUSTOMER_PREFIX: "1392",
  DOKU_VA_MANDIRI: "88899",
  DOKU_VA_MANDIRI_CUSTOMER_PREFIX: "8889",
  DOKU_QRIS_MERCHANT_ID: "QRIS-MID-01",
  DOKU_QRIS_TERMINAL_ID: "TERM01",
  DOKU_QRIS_POSTAL_CODE: "43191",
};

export type Call = { method: string; path: string; headers: Record<string, string>; body: unknown };

type Responder = (call: Call) => { status?: number; body: unknown } | undefined;

export function installFakeDoku(opts: { respond?: Responder } = {}) {
  Object.assign(process.env, DOKU_ENV);
  resetDokuClient();
  const calls: Call[] = [];
  let tokens = 0;
  /* Starts at 122 so the first number in a test is ...8492000123. */
  let vaCount = 122;
  let qrCount = 0;
  const issued = new Set<string>();

  const fetchMock = vi.fn(async (input: string | URL, init: RequestInit = {}) => {
    const url = new URL(String(input));
    const headers = Object.fromEntries(new Headers(init.headers).entries());
    const raw = typeof init.body === "string" ? init.body : "";
    const call: Call = { method: init.method ?? "GET", path: url.pathname, headers, body: raw ? JSON.parse(raw) : undefined };
    calls.push(call);
    const reply = (status: number, body: unknown) => new Response(JSON.stringify(body), { status, headers: { "content-type": "application/json" } });

    if (url.origin !== "https://api-sandbox.doku.com") return reply(404, { responseMessage: "wrong host" });

    if (call.path === "/authorization/v1/access-token/b2b") {
      const ok = headers["x-client-key"] === DOKU_ENV.DOKU_CLIENT_ID && verifyAsymmetric(merchantKeys.publicKey, DOKU_ENV.DOKU_CLIENT_ID, headers["x-timestamp"], headers["x-signature"]);
      if (!ok) return reply(401, { responseCode: "4017300", responseMessage: "Unauthorized. Signature" });
      const accessToken = `tok-${++tokens}`;
      issued.add(accessToken);
      return reply(200, { responseCode: "2007300", responseMessage: "Successful", accessToken, tokenType: "Bearer", expiresIn: 900 });
    }

    /* Non-SNAP (cards): HMAC-SHA256 over Client-Id, Request-Id, Request-Timestamp,
       Request-Target and, for POST, the body digest. No bearer token. */
    if (call.path === "/credit-card/v1/payment-page" || call.path.startsWith("/orders/v1/status/")) {
      const expectedSig = signNonSnap(DOKU_ENV.DOKU_SECRET_KEY, { clientId: DOKU_ENV.DOKU_CLIENT_ID, requestId: headers["request-id"], timestamp: headers["request-timestamp"], target: call.path, body: call.method === "POST" ? raw : undefined });
      if (headers["client-id"] !== DOKU_ENV.DOKU_CLIENT_ID || headers.signature !== expectedSig || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\dZ$/.test(headers["request-timestamp"] ?? "")) {
        return reply(401, { error: { code: "invalid_signature", message: "Invalid Signature" } });
      }
      const custom = opts.respond?.(call);
      if (custom) return reply(custom.status ?? 200, custom.body);
      if (call.path === "/credit-card/v1/payment-page") {
        const b = call.body as { order: { invoice_number: string; amount: number; line_items: { price: number; quantity: number }[] } };
        if (b.order.line_items.reduce((s, l) => s + l.price * l.quantity, 0) !== b.order.amount) return reply(400, { error: { code: "INVALID_PARAMETER", message: "Invalid Total Amount And Line Items" } });
        /* The real sandbox answer (17 Nov 2026): the page URL at the top level. */
        return reply(200, { order: { invoice_number: b.order.invoice_number, line_items: b.order.line_items }, credit_card_payment_page: { url: `https://sandbox.doku.com/cc/pay/${b.order.invoice_number}` } });
      }
      return reply(200, { order: { invoice_number: call.path.split("/").pop(), amount: 0 }, transaction: { status: "PENDING" } });
    }

    const token = (headers.authorization ?? "").replace(/^Bearer /, "");
    const expected = signSymmetric(DOKU_ENV.DOKU_SECRET_KEY, call.method, call.path, token, raw, headers["x-timestamp"]);
    /* Direct debit (e-wallet) calls carry no CHANNEL-ID; VA and QRIS carry H2H. */
    const directDebit = call.path.startsWith("/direct-debit/") || call.path === "/orders/v1.0/debit/status";
    const channelOk = directDebit ? headers["channel-id"] === undefined : headers["channel-id"] === "H2H";
    if (!issued.has(token) || headers["x-signature"] !== expected || headers["x-partner-id"] !== DOKU_ENV.DOKU_CLIENT_ID || !/^\d+$/.test(headers["x-external-id"] ?? "") || !channelOk) {
      return reply(401, { responseCode: "4012700", responseMessage: "Unauthorized. Signature" });
    }

    const custom = opts.respond?.(call);
    if (custom) return reply(custom.status ?? 200, custom.body);

    if (call.path.endsWith("/transfer-va/create-va")) {
      /* DGPC, as the real sandbox behaves (checked 17 Nov 2026): the request
         must carry a 10-digit customerNo starting with the bank's customer
         prefix and virtualAccountNo = partnerServiceId + customerNo, or DOKU
         answers 4032715; DOKU then makes ITS OWN number and returns it. */
      const b = call.body as { trxId: string; partnerServiceId: string; customerNo?: string; virtualAccountNo?: string };
      const bank = Object.entries(DOKU_ENV).find(([k, v]) => k.endsWith("_CUSTOMER_PREFIX") === false && k.startsWith("DOKU_VA_") && v.padStart(8, " ") === b.partnerServiceId)?.[0];
      const prefix = bank ? DOKU_ENV[`${bank}_CUSTOMER_PREFIX` as keyof typeof DOKU_ENV] : undefined;
      if (!prefix || !b.customerNo || !new RegExp(`^${prefix}\\d{${10 - prefix.length}}$`).test(b.customerNo) || b.virtualAccountNo !== `${b.partnerServiceId}${b.customerNo}`) {
        return reply(403, { responseCode: "4032715", responseMessage: "Transaction Not Permitted.[Combination of partnerServiceId, customerNo, and virtualAccountNo]" });
      }
      const customerNo = String(++vaCount).padStart(11, "0");
      return reply(200, { responseCode: "2002700", responseMessage: "Successful", virtualAccountData: { ...b, customerNo, virtualAccountNo: `${b.partnerServiceId}${customerNo}` } });
    }
    if (call.path === "/direct-debit/core/v1/debit/payment-host-to-host") {
      const b = call.body as { partnerReferenceNo: string; additionalInfo?: { channel?: string } };
      if (!["EMONEY_DANA_SNAP", "EMONEY_SHOPEE_PAY_SNAP"].includes(b.additionalInfo?.channel ?? "")) return reply(400, { responseCode: "4005402", responseMessage: "Invalid Field Format" });
      return reply(200, { responseCode: "2005400", responseMessage: "Successful", webRedirectUrl: `https://sandbox.doku.com/ewallet/pay/${b.partnerReferenceNo}`, referenceNo: `DOKU-EW-${++qrCount}`, partnerReferenceNo: b.partnerReferenceNo });
    }
    if (call.path === "/orders/v1.0/debit/status") {
      return reply(200, { responseCode: "2005500", responseMessage: "Successful", latestTransactionStatus: "03", transactionStatusDesc: "Pending" });
    }
    if (call.path === "/snap-adapter/b2b/v1.0/qr/qr-mpm-generate") {
      const b = call.body as { partnerReferenceNo: string; merchantId: string; terminalId: string; amount: { value: string } };
      if (b.merchantId !== DOKU_ENV.DOKU_QRIS_MERCHANT_ID || b.terminalId !== DOKU_ENV.DOKU_QRIS_TERMINAL_ID || !/^\d{1,16}\.00$/.test(b.amount?.value ?? "")) {
        return reply(400, { responseCode: "4004702", responseMessage: "Invalid Mandatory Field" });
      }
      return reply(200, { responseCode: "2004700", responseMessage: "Successful", referenceNo: `DOKU-QR-${++qrCount}`, partnerReferenceNo: b.partnerReferenceNo, qrContent: `00020101021226QRIS${b.partnerReferenceNo}5303360540${b.amount.value}6304ABCD`, terminalId: b.terminalId });
    }
    if (call.path === "/snap-adapter/b2b/v1.0/qr/qr-mpm-query") {
      return reply(200, { responseCode: "2005100", responseMessage: "Successful", latestTransactionStatus: "03", transactionStatusDesc: "Pending" });
    }
    if (call.path === "/snap-adapter/b2b/v1.0/qr/qr-expire") return reply(200, { responseCode: "2005300", responseMessage: "Successful" });
    if (call.path.endsWith("/transfer-va/delete-va")) return reply(200, { responseCode: "2003100", responseMessage: "Successful" });
    if (call.path === "/orders/v1.0/transfer-va/status") {
      return reply(200, { responseCode: "2002600", responseMessage: "Successful", virtualAccountData: { paymentFlagReason: { english: "Pending" }, paymentFlagStatus: "01" } });
    }
    return reply(404, { responseCode: "4040000", responseMessage: "not in fake" });
  });

  vi.stubGlobal("fetch", fetchMock);
  return { calls, fetchMock, tokenCount: () => tokens };
}

/** Headers DOKU sends when it asks us for a notification token. */
export function dokuTokenRequestHeaders(now = new Date()) {
  const ts = snapTimestamp(now);
  return {
    "x-client-key": DOKU_ENV.DOKU_CLIENT_ID,
    "x-timestamp": ts,
    "x-signature": signAsymmetric(dokuKeys.privateKey, DOKU_ENV.DOKU_CLIENT_ID, ts),
    "content-type": "application/json",
  };
}
