import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/server/db";
import { seedDatabase } from "@/lib/server/seed-db";
import { findBooking } from "@/lib/server/bookings";
import { createEwallet, ewalletStatus, EWALLET_CHANNEL } from "@/lib/server/payments/doku/ewallet";
import { snapTimestamp } from "@/lib/server/payments/doku/snap";
import { POST as dokuToken } from "@/app/authorization/v1/access-token/b2b/route";
import { POST as notify } from "@/app/api/webhooks/doku/[[...rest]]/route";
import { POST as createBooking } from "@/app/api/bookings/route";
import { POST as checkPayment } from "@/app/api/bookings/[code]/check-payment/route";
import { dokuTokenRequestHeaders, installFakeDoku } from "../doku-fake";
import { resetDb } from "../setup";

let fake: ReturnType<typeof installFakeDoku>;
let ip = 0;
const post = (path: string, body: unknown, from = `10.3.0.${++ip}`) =>
  new Request(`http://localhost${path}`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": from }, body: JSON.stringify(body) });
const ctx = (code: string) => ({ params: Promise.resolve({ code }) });

beforeEach(async () => {
  fake = installFakeDoku();
  process.env.SITE_URL = "https://sukavillage.com";
  await resetDb();
  await seedDatabase(db);
  await db.rate.updateMany({ data: { bookable: true } });
});
afterEach(() => vi.unstubAllGlobals());

describe("e-wallet adapter (DANA, ShopeePay)", () => {
  const charge = {
    trxId: "SV-EW0001-ab12cd34",
    method: "dana" as const,
    amount: 850_000,
    /* Within DOKU's 24 hour limit, so validUpTo is the hold itself. */
    expiresAt: new Date(Math.floor(Date.now() / 1000) * 1000 + 3600_000).toISOString(),
    returnUrl: "https://sukavillage.com/id/booking/SV-EW0001",
    ip: "203.0.113.7",
    title: "Suka Village SV-EW0001",
  };

  it("one-time payment without account binding: redirect URL back, guest IP sent, no CHANNEL-ID", async () => {
    const r = await createEwallet(charge);
    const call = fake.calls.find((c) => c.path === "/direct-debit/core/v1/debit/payment-host-to-host")!;
    expect(call.headers["x-ip-address"]).toBe("203.0.113.7");
    expect(call.headers["channel-id"]).toBeUndefined();
    expect(call.body).toEqual({
      partnerReferenceNo: "SV-EW0001-ab12cd34",
      amount: { value: "850000.00", currency: "IDR" },
      urlParam: [{ url: "https://sukavillage.com/id/booking/SV-EW0001", type: "PAY_RETURN", isDeepLink: "N" }],
      validUpTo: snapTimestamp(new Date(charge.expiresAt)),
      pointOfInitiation: "mweb",
      additionalInfo: { channel: "EMONEY_DANA_SNAP", orderTitle: "Suka Village SV-EW0001" },
    });
    expect(r).toEqual({ reference: "https://sandbox.doku.com/ewallet/pay/SV-EW0001-ab12cd34", gatewayId: "SV-EW0001-ab12cd34", gatewayRef: "DOKU-EW-1" });
  });

  it("each wallet has its channel; OVO is not offered (it needs account binding)", () => {
    expect(EWALLET_CHANNEL).toEqual({ dana: "EMONEY_DANA_SNAP", shopeepay: "EMONEY_SHOPEE_PAY_SNAP" });
  });

  it("a payment link never outlives DOKU's 24 hour limit", async () => {
    const now = Date.now();
    await createEwallet({ ...charge, expiresAt: new Date(now + 48 * 3600_000).toISOString() });
    const body = fake.calls.find((c) => c.path.endsWith("payment-host-to-host"))!.body as { validUpTo: string };
    const until = Date.parse(body.validUpTo);
    expect(until).toBeLessThanOrEqual(now + 24 * 3600_000 + 1000);
  });

  it("status: 00 is paid", async () => {
    expect(await ewalletStatus({ method: "shopeepay", gatewayId: "SV-EW0001-ab12cd34", gatewayRef: "DOKU-EW-1" })).toBe("pending");
    expect(fake.calls.find((c) => c.path === "/orders/v1.0/debit/status")!.body).toEqual({
      originalPartnerReferenceNo: "SV-EW0001-ab12cd34",
      originalReferenceNo: "DOKU-EW-1",
      serviceCode: "54",
      additionalInfo: { channel: "EMONEY_SHOPEE_PAY_SNAP" },
    });
    fake = installFakeDoku({ respond: (c) => (c.path === "/orders/v1.0/debit/status" ? { body: { responseCode: "2005500", latestTransactionStatus: "00" } } : undefined) });
    expect(await ewalletStatus({ method: "shopeepay", gatewayId: "SV-EW0001-ab12cd34", gatewayRef: "DOKU-EW-1" })).toBe("paid");
  });
});

async function bookEwallet(method: string, from?: string) {
  const res = await createBooking(
    post(
      "/api/bookings",
      { checkIn: "2027-03-10", checkOut: "2027-03-12", units: ["singleCabin"], guests: 2, guest: { name: "Ana Wijaya", email: "ana@example.com", phone: "081234567890" }, method, locale: "en" },
      from,
    ),
  );
  return (await res.json()) as { ok: boolean; error?: string; booking: { code: string; payment: { reference: string } }; token: string };
}

describe("e-wallet booking", () => {
  it("the order carries the wallet's payment URL; it returns the guest to their order page", async () => {
    const r = await bookEwallet("dana", "198.51.100.9");
    expect(r.ok).toBe(true);
    expect(r.booking.payment.reference).toMatch(/^https:\/\/sandbox\.doku\.com\/ewallet\/pay\//);
    const call = fake.calls.find((c) => c.path.endsWith("payment-host-to-host"))!;
    expect(call.headers["x-ip-address"]).toBe("198.51.100.9");
    const body = call.body as { urlParam: { url: string }[] };
    expect(body.urlParam[0].url).toBe(`https://sukavillage.com/en/booking/${r.booking.code}`);
  });

  it("e-wallet notification 00 → paid; answer 2005600", async () => {
    const r = await bookEwallet("dana");
    const p = await db.payment.findUniqueOrThrow({ where: { bookingCode: r.booking.code } });
    const { accessToken } = await (await dokuToken(new Request("http://localhost/t", { method: "POST", headers: dokuTokenRequestHeaders(), body: "{}" }))).json();
    const res = await notify(
      new Request("http://localhost/api/webhooks/doku", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ originalPartnerReferenceNo: p.gatewayId, originalReferenceNo: p.gatewayRef, latestTransactionStatus: "00", amount: { value: `${p.amount}.00`, currency: "IDR" }, additionalInfo: { channel: "EMONEY_DANA_SNAP" } }),
      }),
    );
    expect(res.status).toBe(200);
    expect((await res.json()).responseCode).toBe("2005600");
    expect((await findBooking(r.booking.code))?.status).toBe("paid");
  });

  it("check payment asks the debit status", async () => {
    fake = installFakeDoku({ respond: (c) => (c.path === "/orders/v1.0/debit/status" ? { body: { responseCode: "2005500", latestTransactionStatus: "00" } } : undefined) });
    const r = await bookEwallet("dana");
    const body = await (await checkPayment(post(`/api/bookings/${r.booking.code}/check-payment?t=${r.token}`, {}), ctx(r.booking.code))).json();
    expect(body.status).toBe("paid");
  });

  it("OVO and GoPay are refused before anything is held", async () => {
    expect(await bookEwallet("ovo")).toMatchObject({ ok: false, error: "payment" });
    expect(await bookEwallet("gopay")).toMatchObject({ ok: false, error: "payment" });
    expect(await db.night.count()).toBe(0);
  });
});
