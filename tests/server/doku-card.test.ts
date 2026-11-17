import { createHash, createHmac } from "node:crypto";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/server/db";
import { seedDatabase } from "@/lib/server/seed-db";
import { findBooking } from "@/lib/server/bookings";
import { nonSnapTimestamp, signNonSnap } from "@/lib/server/payments/doku/nonsnap";
import { cardStatus, createCardPage } from "@/lib/server/payments/doku/card";
import { POST as notify } from "@/app/api/webhooks/doku/[[...rest]]/route";
import { POST as createBooking } from "@/app/api/bookings/route";
import { POST as checkPayment } from "@/app/api/bookings/[code]/check-payment/route";
import { DOKU_ENV, installFakeDoku } from "../doku-fake";
import { resetDb } from "../setup";

let fake: ReturnType<typeof installFakeDoku>;
let ip = 0;
const post = (path: string, body: unknown) =>
  new Request(`http://localhost${path}`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `10.4.0.${++ip}` }, body: JSON.stringify(body) });
const ctx = (code: string) => ({ params: Promise.resolve({ code }) });

beforeEach(async () => {
  fake = installFakeDoku();
  process.env.SITE_URL = "https://sukavillage.com";
  await resetDb();
  await seedDatabase(db);
  await db.rate.updateMany({ data: { bookable: true } });
});
afterEach(() => vi.unstubAllGlobals());

describe("Non-SNAP signature (cards)", () => {
  it("HMAC-SHA256 over the component lines, base64, with the HMACSHA256= prefix", () => {
    const body = '{"order":{"amount":1}}';
    const digest = createHash("sha256").update(body).digest("base64");
    const lines = `Client-Id:MCH-1\nRequest-Id:req-1\nRequest-Timestamp:2027-03-01T03:04:05Z\nRequest-Target:/credit-card/v1/payment-page\nDigest:${digest}`;
    const expected = `HMACSHA256=${createHmac("sha256", "secret").update(lines).digest("base64")}`;
    expect(signNonSnap("secret", { clientId: "MCH-1", requestId: "req-1", timestamp: "2027-03-01T03:04:05Z", target: "/credit-card/v1/payment-page", body })).toBe(expected);
  });

  it("GET has no Digest line", () => {
    const lines = "Client-Id:MCH-1\nRequest-Id:req-1\nRequest-Timestamp:2027-03-01T03:04:05Z\nRequest-Target:/orders/v1/status/INV-1";
    expect(signNonSnap("secret", { clientId: "MCH-1", requestId: "req-1", timestamp: "2027-03-01T03:04:05Z", target: "/orders/v1/status/INV-1" })).toBe(`HMACSHA256=${createHmac("sha256", "secret").update(lines).digest("base64")}`);
  });

  it("timestamp is UTC with Z, no milliseconds", () => {
    expect(nonSnapTimestamp(new Date("2027-03-01T03:04:05.678Z"))).toBe("2027-03-01T03:04:05Z");
  });
});

describe("Card payment page", () => {
  const charge = { trxId: "SV-CC0001-ab12cd34", amount: 3_800_000, code: "SV-CC0001", locale: "en" as const, returnUrl: "https://sukavillage.com/en/booking/SV-CC0001", guest: { name: "Ana Wijaya", email: "ana@example.com", phone: "+6281234567890" } };

  it("a SALE on DOKU's hosted page; card details never touch this site", async () => {
    const r = await createCardPage(charge);
    const call = fake.calls.find((c) => c.path === "/credit-card/v1/payment-page")!;
    expect(call.body).toEqual({
      order: {
        invoice_number: "SV-CC0001-ab12cd34",
        amount: 3800000,
        line_items: [{ name: "Suka Village SV-CC0001", price: 3800000, quantity: 1 }],
        callback_url: "https://sukavillage.com/en/booking/SV-CC0001",
        failed_url: "https://sukavillage.com/en/booking/SV-CC0001",
        auto_redirect: true,
      },
      customer: { id: "SV-CC0001", name: "Ana Wijaya", email: "ana@example.com", phone: "6281234567890", country: "ID" },
      payment: { type: "SALE" },
      override_configuration: { themes: { language: "EN" } },
    });
    expect(r).toEqual({ reference: "https://sandbox.doku.com/cc/pay/SV-CC0001-ab12cd34", gatewayId: "SV-CC0001-ab12cd34" });
  });

  it("status: SUCCESS is paid", async () => {
    expect(await cardStatus("SV-CC0001-ab12cd34")).toBe("pending");
    expect(fake.calls.at(-1)!.method).toBe("GET");
    fake = installFakeDoku({ respond: (c) => (c.path.startsWith("/orders/v1/status/") ? { body: { transaction: { status: "SUCCESS" } } } : undefined) });
    expect(await cardStatus("SV-CC0001-ab12cd34")).toBe("paid");
  });
});

/** A card notification signed by DOKU with our secret, for our notification path. */
function dokuCardNotification(body: unknown, opts: { path?: string; secret?: string } = {}) {
  const raw = JSON.stringify(body);
  const path = opts.path ?? "/api/webhooks/doku";
  const timestamp = nonSnapTimestamp();
  const headers = {
    "content-type": "application/json",
    "client-id": DOKU_ENV.DOKU_CLIENT_ID,
    "request-id": `n-${Math.random()}`,
    "request-timestamp": timestamp,
  };
  const signature = signNonSnap(opts.secret ?? DOKU_ENV.DOKU_SECRET_KEY, { clientId: headers["client-id"], requestId: headers["request-id"], timestamp, target: path, body: raw });
  return notify(new Request(`http://localhost${path}`, { method: "POST", headers: { ...headers, signature }, body: raw }));
}

async function bookCard() {
  const res = await createBooking(post("/api/bookings", { checkIn: "2027-03-10", checkOut: "2027-03-12", units: ["mainVilla"], guests: 4, guest: { name: "Ana Wijaya", email: "ana@example.com", phone: "081234567890" }, method: "card", locale: "id" }));
  return (await res.json()) as { ok: boolean; booking: { code: string; payment: { reference: string; amount: number } }; token: string };
}

describe("card booking", () => {
  it("the order carries DOKU's card page URL", async () => {
    const r = await bookCard();
    expect(r.ok).toBe(true);
    expect(r.booking.payment.reference).toMatch(/^https:\/\/sandbox\.doku\.com\/cc\/pay\/SV-/);
  });

  it("a signed SUCCESS notification → paid, once", async () => {
    const r = await bookCard();
    const p = await db.payment.findUniqueOrThrow({ where: { bookingCode: r.booking.code } });
    const body = { order: { invoice_number: p.gatewayId, amount: p.amount }, transaction: { status: "SUCCESS", date: "2027-03-01T03:15:26Z" }, service: { id: "CREDIT_CARD" }, channel: { id: "CREDIT_CARD" } };
    expect((await dokuCardNotification(body)).status).toBe(200);
    expect((await dokuCardNotification(body)).status).toBe(200);
    const b = await findBooking(r.booking.code);
    expect(b?.status).toBe("paid");
    expect(b?.notifications.filter((n) => n.template === "payment_received")).toHaveLength(1);
  });

  it("a notification signed with another secret → 401, nothing changes", async () => {
    const r = await bookCard();
    const p = await db.payment.findUniqueOrThrow({ where: { bookingCode: r.booking.code } });
    const res = await dokuCardNotification({ order: { invoice_number: p.gatewayId, amount: p.amount }, transaction: { status: "SUCCESS" } }, { secret: "not-ours" });
    expect(res.status).toBe(401);
    expect((await findBooking(r.booking.code))?.status).toBe("pending");
  });

  it("a FAILED card payment changes nothing", async () => {
    const r = await bookCard();
    const p = await db.payment.findUniqueOrThrow({ where: { bookingCode: r.booking.code } });
    expect((await dokuCardNotification({ order: { invoice_number: p.gatewayId, amount: p.amount }, transaction: { status: "FAILED" } })).status).toBe(200);
    expect((await findBooking(r.booking.code))?.status).toBe("pending");
  });

  it("check payment asks the order status", async () => {
    fake = installFakeDoku({ respond: (c) => (c.path.startsWith("/orders/v1/status/") ? { body: { transaction: { status: "SUCCESS" } } } : undefined) });
    const r = await bookCard();
    const body = await (await checkPayment(post(`/api/bookings/${r.booking.code}/check-payment?t=${r.token}`, {}), ctx(r.booking.code))).json();
    expect(body.status).toBe("paid");
  });
});
