import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/server/db";
import { seedDatabase } from "@/lib/server/seed-db";
import { findBooking } from "@/lib/server/bookings";
import { createQris, expireQris, qrisStatus } from "@/lib/server/payments/doku/qris";
import { POST as dokuToken } from "@/app/authorization/v1/access-token/b2b/route";
import { POST as notify } from "@/app/api/webhooks/doku/[[...rest]]/route";
import { POST as createBooking } from "@/app/api/bookings/route";
import { POST as checkPayment } from "@/app/api/bookings/[code]/check-payment/route";
import { POST as changeMethod } from "@/app/api/bookings/[code]/payment-method/route";
import { dokuTokenRequestHeaders, installFakeDoku } from "../doku-fake";
import { resetDb } from "../setup";

let fake: ReturnType<typeof installFakeDoku>;
let ip = 0;
const post = (path: string, body: unknown) =>
  new Request(`http://localhost${path}`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `10.2.0.${++ip}` }, body: JSON.stringify(body) });
const ctx = (code: string) => ({ params: Promise.resolve({ code }) });

beforeEach(async () => {
  fake = installFakeDoku();
  await resetDb();
  await seedDatabase(db);
  await db.rate.updateMany({ data: { bookable: true } });
});
afterEach(() => vi.unstubAllGlobals());

describe("QRIS adapter", () => {
  const charge = { trxId: "SV-QR0001-ab12cd34", amount: 1_650_000, expiresAt: "2027-03-01T04:00:00.000Z" };

  it("generates a dynamic QR for the exact amount, valid until the hold ends", async () => {
    const r = await createQris(charge);
    const call = fake.calls.find((c) => c.path.endsWith("qr-mpm-generate"))!;
    expect(call.body).toEqual({
      partnerReferenceNo: "SV-QR0001-ab12cd34",
      amount: { value: "1650000.00", currency: "IDR" },
      merchantId: "QRIS-MID-01",
      terminalId: "TERM01",
      validityPeriod: "2027-03-01T11:00:00+07:00",
      additionalInfo: { postalCode: "43191", feeType: "1" },
    });
    expect(r).toEqual({ reference: expect.stringMatching(/^000201/), gatewayId: "SV-QR0001-ab12cd34", gatewayRef: "DOKU-QR-1" });
  });

  it("status: 00 is paid, anything else is not yet", async () => {
    expect(await qrisStatus({ gatewayId: "SV-QR0001-ab12cd34", gatewayRef: "DOKU-QR-1" })).toBe("pending");
    const q = fake.calls.find((c) => c.path.endsWith("qr-mpm-query"))!;
    expect(q.body).toEqual({ originalReferenceNo: "DOKU-QR-1", originalPartnerReferenceNo: "SV-QR0001-ab12cd34", serviceCode: "47", merchantId: "QRIS-MID-01" });
    fake = installFakeDoku({ respond: (c) => (c.path.endsWith("qr-mpm-query") ? { body: { responseCode: "2005100", latestTransactionStatus: "00" } } : undefined) });
    expect(await qrisStatus({ gatewayId: "SV-QR0001-ab12cd34", gatewayRef: "DOKU-QR-1" })).toBe("paid");
  });

  it("expire makes the QR unpayable", async () => {
    await expireQris({ gatewayId: "SV-QR0001-ab12cd34", gatewayRef: "DOKU-QR-1" });
    expect(fake.calls.find((c) => c.path.endsWith("qr-expire"))!.body).toEqual({ partnerReferenceNo: "SV-QR0001-ab12cd34", referenceNo: "DOKU-QR-1", merchantId: "QRIS-MID-01" });
  });
});

async function bookQris() {
  const res = await createBooking(
    post("/api/bookings", {
      checkIn: "2027-03-10",
      checkOut: "2027-03-12",
      units: ["familyCabin"],
      guests: 2,
      guest: { name: "Ana Wijaya", email: "ana@example.com", phone: "081234567890" },
      method: "qris",
      locale: "id",
    }),
  );
  return (await res.json()) as { ok: boolean; booking: { code: string; payment: { reference: string; amount: number } }; token: string };
}

async function dokuNotifiesQris(body: Record<string, unknown>) {
  const { accessToken } = await (await dokuToken(new Request("http://localhost/t", { method: "POST", headers: dokuTokenRequestHeaders(), body: "{}" }))).json();
  return notify(new Request("http://localhost/api/webhooks/doku/v1.0/qr/qr-mpm-notify", { method: "POST", headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` }, body: JSON.stringify(body) }));
}

describe("QRIS booking", () => {
  it("the order carries the QR string; the awaiting_payment email is sent", async () => {
    const r = await bookQris();
    expect(r.ok).toBe(true);
    expect(r.booking.payment.reference).toMatch(/^000201/);
    const p = await db.payment.findUniqueOrThrow({ where: { bookingCode: r.booking.code } });
    expect(p.gatewayRef).toBe("DOKU-QR-1");
    expect((await db.notification.findMany({ where: { bookingCode: r.booking.code } })).map((n) => n.template)).toEqual(["awaiting_payment"]);
  });

  it("QRIS notification 00 → paid, SNAP 2005200 answer, one email per repeat", async () => {
    const r = await bookQris();
    const p = await db.payment.findUniqueOrThrow({ where: { bookingCode: r.booking.code } });
    const body = { originalReferenceNo: p.gatewayRef, originalPartnerReferenceNo: p.gatewayId, latestTransactionStatus: "00", transactionStatusDesc: "Success", amount: { value: `${p.amount}.00`, currency: "IDR" } };
    const res = await dokuNotifiesQris(body);
    expect(res.status).toBe(200);
    expect((await res.json()).responseCode).toBe("2005200");
    await dokuNotifiesQris(body);
    const b = await findBooking(r.booking.code);
    expect(b?.status).toBe("paid");
    expect(b?.notifications.filter((n) => n.template === "payment_received")).toHaveLength(1);
  });

  it("a QRIS notification that is not a success changes nothing", async () => {
    const r = await bookQris();
    const p = await db.payment.findUniqueOrThrow({ where: { bookingCode: r.booking.code } });
    const res = await dokuNotifiesQris({ originalReferenceNo: p.gatewayRef, originalPartnerReferenceNo: p.gatewayId, latestTransactionStatus: "06", amount: { value: `${p.amount}.00`, currency: "IDR" } });
    expect(res.status).toBe(200);
    expect((await findBooking(r.booking.code))?.status).toBe("pending");
  });

  it("check payment asks the QRIS query", async () => {
    fake = installFakeDoku({ respond: (c) => (c.path.endsWith("qr-mpm-query") ? { body: { responseCode: "2005100", latestTransactionStatus: "00" } } : undefined) });
    const r = await bookQris();
    const body = await (await checkPayment(post(`/api/bookings/${r.booking.code}/check-payment?t=${r.token}`, {}), ctx(r.booking.code))).json();
    expect(body.status).toBe("paid");
  });

  it("switching from QRIS to a VA expires the QR", async () => {
    const r = await bookQris();
    const res = await changeMethod(post(`/api/bookings/${r.booking.code}/payment-method?t=${r.token}`, { method: "va_bni" }), ctx(r.booking.code));
    expect(res.status).toBe(200);
    expect(fake.calls.filter((c) => c.path.endsWith("qr-expire"))).toHaveLength(1);
    const p = await db.payment.findUniqueOrThrow({ where: { bookingCode: r.booking.code } });
    expect(p.gatewayRef).toBeNull();
  });
});
