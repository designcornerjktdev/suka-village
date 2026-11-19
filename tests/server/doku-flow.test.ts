import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { db } from "@/lib/server/db";
import { seedDatabase } from "@/lib/server/seed-db";
import { findBooking } from "@/lib/server/bookings";
import { POST as dokuToken } from "@/app/authorization/v1/access-token/b2b/route";
import { POST as notify } from "@/app/api/webhooks/doku/[[...rest]]/route";
import { POST as createBooking } from "@/app/api/bookings/route";
import { POST as checkPayment } from "@/app/api/bookings/[code]/check-payment/route";
import { POST as changeMethod } from "@/app/api/bookings/[code]/payment-method/route";
import { POST as guestCancel } from "@/app/api/bookings/[code]/cancel/route";
import { DOKU_ENV, dokuTokenRequestHeaders, installFakeDoku } from "../doku-fake";
import { CHARGE_GRACE_MS } from "@/lib/server/payments/charges";
import { createAdmin } from "@/lib/server/admins";
import { setAdminAlertTransport } from "@/lib/server/mail";
import { snapTimestamp } from "@/lib/server/payments/doku/snap";
import { resetDb } from "../setup";

let fake: ReturnType<typeof installFakeDoku>;
let ip = 100;
const ctx = (code: string) => ({ params: Promise.resolve({ code }) });
const post = (path: string, body: unknown, headers: Record<string, string> = {}) =>
  new Request(`http://localhost${path}`, { method: "POST", headers: { "content-type": "application/json", "x-forwarded-for": `10.1.0.${++ip}`, ...headers }, body: JSON.stringify(body) });

async function book(method = "va_bca") {
  const res = await createBooking(
    post("/api/bookings", {
      checkIn: "2027-03-10",
      checkOut: "2027-03-12",
      units: ["mainVilla"],
      guests: 4,
      guest: { name: "Ana Wijaya", email: "ana@example.com", phone: "081234567890" },
      method,
      locale: "id",
    }),
  );
  return (await res.json()) as { ok: boolean; error?: string; booking: { code: string; payment: { reference: string; gatewayId?: string; amount: number } }; token: string };
}

/** DOKU's two steps: get a token from us, then POST the payment. */
async function dokuNotifies(body: Record<string, unknown>, opts: { token?: string; path?: string } = {}) {
  const tokenRes = await dokuToken(new Request("http://localhost/authorization/v1/access-token/b2b", { method: "POST", headers: dokuTokenRequestHeaders(), body: JSON.stringify({ grantType: "client_credentials" }) }));
  const { accessToken } = await tokenRes.json();
  const path = opts.path ?? "/api/webhooks/doku/v1.1/transfer-va/payment";
  return notify(
    new Request(`http://localhost${path}`, {
      method: "POST",
      headers: { "content-type": "application/json", authorization: `Bearer ${opts.token ?? accessToken}`, "x-external-id": String(Math.random()).slice(2) },
      body: JSON.stringify(body),
    }),
  );
}

const vaPaid = (b: { code: string; payment: { reference: string; gatewayId?: string; amount: number } }, over: Record<string, unknown> = {}) => ({
  partnerServiceId: "   19008",
  customerNo: b.payment.reference.slice(5),
  virtualAccountNo: `   ${b.payment.reference}`,
  virtualAccountName: "Ana Wijaya",
  trxId: (b.payment as { gatewayId?: string }).gatewayId,
  paymentRequestId: "pay-1",
  paidAmount: { value: `${b.payment.amount}.00`, currency: "IDR" },
  additionalInfo: { channel: "VIRTUAL_ACCOUNT_BCA" },
  ...over,
});

beforeEach(async () => {
  fake = installFakeDoku();
  await resetDb();
  await seedDatabase(db);
  await db.rate.updateMany({ data: { bookable: true } });
});
afterEach(() => vi.unstubAllGlobals());

describe("token endpoint for DOKU", () => {
  it("gives DOKU a token when the request is signed with DOKU's key", async () => {
    const res = await dokuToken(new Request("http://localhost/authorization/v1/access-token/b2b", { method: "POST", headers: dokuTokenRequestHeaders(), body: "{}" }));
    expect(res.status).toBe(200);
    expect(await res.json()).toMatchObject({ responseCode: "2007300", tokenType: "Bearer", expiresIn: 900 });
  });

  it("refuses a request not signed by DOKU", async () => {
    const h = { ...dokuTokenRequestHeaders(), "x-signature": "palsu" };
    const res = await dokuToken(new Request("http://localhost/authorization/v1/access-token/b2b", { method: "POST", headers: h, body: "{}" }));
    expect(res.status).toBe(401);
    expect((await res.json()).responseCode).toBe("4017300");
    const other = await dokuToken(new Request("http://localhost/x", { method: "POST", headers: { ...dokuTokenRequestHeaders(), "x-client-key": "SOMEONE-ELSE" }, body: "{}" }));
    expect(other.status).toBe(401);
  });
});

describe("booking opens a VA and emails the instructions", () => {
  it("the order carries the VA number, and awaiting_payment is sent", async () => {
    const r = await book();
    expect(r.ok).toBe(true);
    expect(r.booking.payment.reference).toMatch(/^19008\d{11}$/);
    const n = await db.notification.findMany({ where: { bookingCode: r.booking.code } });
    expect(n.map((x) => x.template)).toEqual(["awaiting_payment"]);
  });

  it("if DOKU refuses, the booking is cancelled and the nights released", async () => {
    fake = installFakeDoku({ respond: (c) => (c.path.endsWith("create-va") ? { status: 500, body: { responseCode: "5002700", responseMessage: "General Error" } } : undefined) });
    const r = await book();
    expect(r).toMatchObject({ ok: false, error: "payment" });
    expect(await db.night.count()).toBe(0);
    expect((await db.booking.findFirstOrThrow()).status).toBe("cancelled");
  });

  it("a method not built yet is refused before anything is held", async () => {
    const r = await book("ovo");
    expect(r).toMatchObject({ ok: false, error: "payment" });
    expect(await db.night.count()).toBe(0);
  });
});

describe("payment notification", () => {
  it("paid → waiting for the admin, payment_received emailed, SNAP success answer", async () => {
    const r = await book();
    const res = await dokuNotifies(vaPaid(r.booking));
    expect(res.status).toBe(200);
    expect((await res.json()).responseCode).toBe("2002500");
    const b = await findBooking(r.booking.code);
    expect(b?.status).toBe("paid");
    expect(b?.notifications.map((n) => n.template)).toEqual(["awaiting_payment", "payment_received"]);
  });

  it("accepted on the bare notification URL too", async () => {
    const r = await book();
    expect((await dokuNotifies(vaPaid(r.booking), { path: "/api/webhooks/doku" })).status).toBe(200);
    expect((await findBooking(r.booking.code))?.status).toBe("paid");
  });

  it("the same notification twice: one change, one email", async () => {
    const r = await book();
    await dokuNotifies(vaPaid(r.booking));
    expect((await dokuNotifies(vaPaid(r.booking))).status).toBe(200);
    const b = await findBooking(r.booking.code);
    expect(b?.notifications.filter((n) => n.template === "payment_received")).toHaveLength(1);
    expect(b?.history.filter((h) => h.by === "gateway")).toHaveLength(1);
  });

  it("without our token → 401 and nothing changes", async () => {
    const r = await book();
    const res = await dokuNotifies(vaPaid(r.booking), { token: "bukan.token.kami" });
    expect(res.status).toBe(401);
    expect((await findBooking(r.booking.code))?.status).toBe("pending");
  });

  it("an amount that does not match is refused and logged", async () => {
    const r = await book();
    const res = await dokuNotifies(vaPaid(r.booking, { paidAmount: { value: "1000.00", currency: "IDR" } }));
    expect(res.status).toBe(400);
    const b = await findBooking(r.booking.code);
    expect(b?.status).toBe("pending");
    expect(b?.history.at(-1)?.event).toContain("tidak sesuai");
  });

  it("paid after the booking expired: kept expired, refund flagged", async () => {
    const r = await book();
    await db.payment.update({ where: { bookingCode: r.booking.code }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const res = await dokuNotifies(vaPaid(r.booking));
    expect(res.status).toBe(200);
    const row = await db.booking.findUniqueOrThrow({ where: { code: r.booking.code }, include: { events: true } });
    expect(row.status).toBe("expired");
    expect(row.refundOwed).toBe(true);
    expect(row.events.map((e) => e.event)).toContain("Pembayaran masuk setelah pesanan berakhir, perlu refund");
  });

  it("paid after expiry: every admin is emailed, once, and the history says so (review I4)", async () => {
    await createAdmin(db, { email: "owner@sukavillage.com", username: "owner", displayName: "Owner", password: "kata-sandi-panjang" });
    await createAdmin(db, { email: "staff@sukavillage.com", username: "staff", displayName: "Staff", password: "kata-sandi-panjang" });
    const r = await book();
    await db.payment.update({ where: { bookingCode: r.booking.code }, data: { expiresAt: new Date(Date.now() - 1000) } });
    const sent: { to: string; subject: string; text: string }[] = [];
    setAdminAlertTransport({ sendMail: async (m: { to: string; subject: string; text: string }) => void sent.push(m) } as never);
    try {
      await dokuNotifies(vaPaid(r.booking));
      await dokuNotifies(vaPaid(r.booking));
    } finally {
      setAdminAlertTransport(null);
    }
    expect(sent.map((m) => m.to).sort()).toEqual(["owner@sukavillage.com", "staff@sukavillage.com"]);
    expect(sent[0].subject).toContain(r.booking.code);
    expect(sent[0].text).toContain("refund");
    const events = (await db.bookingEvent.findMany({ where: { bookingCode: r.booking.code } })).map((e) => e.event);
    expect(events).toContain("Admin diberi tahu lewat email: perlu refund");
  });

  it("unknown transaction → 404", async () => {
    await book();
    const res = await dokuNotifies({ trxId: "SV-NOPE-1", paidAmount: { value: "1.00", currency: "IDR" } });
    expect(res.status).toBe(404);
  });
});

describe("an old charge paid after the method was changed (review I1)", () => {
  it("the payment is still matched to the booking: paid, method of the charge that was paid", async () => {
    const r = await book("dana");
    const danaTrx = (await db.payment.findUniqueOrThrow({ where: { bookingCode: r.booking.code } })).gatewayId!;
    /* The guest switches to a VA; the DANA link cannot be closed at DOKU. */
    await changeMethod(post(`/api/bookings/${r.booking.code}/payment-method?t=${r.token}`, { method: "va_bni" }), ctx(r.booking.code));
    const p = await db.payment.findUniqueOrThrow({ where: { bookingCode: r.booking.code } });
    expect(p.gatewayId).not.toBe(danaTrx);
    /* ...and then pays the old DANA link anyway. */
    const { accessToken } = await (await dokuToken(new Request("http://localhost/t", { method: "POST", headers: dokuTokenRequestHeaders(), body: "{}" }))).json();
    const res = await notify(
      new Request("http://localhost/api/webhooks/doku", {
        method: "POST",
        headers: { "content-type": "application/json", authorization: `Bearer ${accessToken}` },
        body: JSON.stringify({ originalPartnerReferenceNo: danaTrx, originalReferenceNo: "x", latestTransactionStatus: "00", amount: { value: `${p.amount}.00`, currency: "IDR" } }),
      }),
    );
    expect(res.status).toBe(200);
    const b = await findBooking(r.booking.code);
    expect(b?.status).toBe("paid");
    expect(b?.payment.method).toBe("dana");
    expect(b?.notifications.map((n) => n.template)).toContain("payment_received");
  });
});

describe("a payment in the last seconds (review I2)", () => {
  it("DOKU's charge ends 5 minutes before the hold, so its notification lands before the booking expires", async () => {
    const r = await book();
    const p = await db.payment.findUniqueOrThrow({ where: { bookingCode: r.booking.code } });
    const sent = fake.calls.find((c) => c.path.endsWith("create-va"))!.body as { expiredDate: string };
    expect(sent.expiredDate).toBe(snapTimestamp(new Date(p.expiresAt.getTime() - CHARGE_GRACE_MS)));
    expect(CHARGE_GRACE_MS).toBe(5 * 60_000);
  });

  it("paid at the charge's last moment, notified a minute later: paid, not expired", async () => {
    const r = await book();
    const p = await db.payment.findUniqueOrThrow({ where: { bookingCode: r.booking.code } });
    /* The hold has 4 minutes left: the guest paid as the VA closed, DOKU notifies now. */
    await db.payment.update({ where: { bookingCode: r.booking.code }, data: { expiresAt: new Date(Date.now() + 4 * 60_000) } });
    expect((await dokuNotifies(vaPaid({ code: r.booking.code, payment: { reference: p.reference, gatewayId: p.gatewayId!, amount: p.amount } }))).status).toBe(200);
    expect((await findBooking(r.booking.code))?.status).toBe("paid");
  });
});

describe("guest actions on the order page", () => {
  it("change payment method: old VA deleted, new one opened, same deadline", async () => {
    const r = await book();
    const before = await db.payment.findUniqueOrThrow({ where: { bookingCode: r.booking.code } });
    const res = await changeMethod(post(`/api/bookings/${r.booking.code}/payment-method?t=${r.token}`, { method: "va_bni" }), ctx(r.booking.code));
    expect(res.status).toBe(200);
    const after = await db.payment.findUniqueOrThrow({ where: { bookingCode: r.booking.code } });
    expect(after.method).toBe("va_bni");
    expect(after.reference).toMatch(/^84923\d{11}$/);
    expect(after.gatewayId).not.toBe(before.gatewayId);
    expect(after.expiresAt.toISOString()).toBe(before.expiresAt.toISOString());
    expect(fake.calls.filter((c) => c.path.endsWith("delete-va"))).toHaveLength(1);
    expect((await findBooking(r.booking.code))?.history.at(-1)?.event).toBe("Cara bayar diganti");
  });

  it("change payment method needs the token and a pending booking", async () => {
    const r = await book();
    expect((await changeMethod(post(`/api/bookings/${r.booking.code}/payment-method`, { method: "va_bni" }), ctx(r.booking.code))).status).toBe(404);
    await dokuNotifies(vaPaid(r.booking));
    expect((await changeMethod(post(`/api/bookings/${r.booking.code}/payment-method?t=${r.token}`, { method: "va_bni" }), ctx(r.booking.code))).status).toBe(409);
  });

  it("check payment asks DOKU and answers with the booking", async () => {
    const r = await book();
    const res = await checkPayment(post(`/api/bookings/${r.booking.code}/check-payment?t=${r.token}`, {}), ctx(r.booking.code));
    expect(res.status).toBe(200);
    expect((await res.json()).status).toBe("pending");
    expect(fake.calls.some((c) => c.path === "/orders/v1.0/transfer-va/status")).toBe(true);
  });

  it("check payment: DOKU says paid → paid, even before the notification", async () => {
    fake = installFakeDoku({ respond: (c) => (c.path === "/orders/v1.0/transfer-va/status" ? { body: { responseCode: "2002600", virtualAccountData: { paymentFlagStatus: "00" } } } : undefined) });
    const r = await book();
    const body = await (await checkPayment(post(`/api/bookings/${r.booking.code}/check-payment?t=${r.token}`, {}), ctx(r.booking.code))).json();
    expect(body.status).toBe("paid");
  });

  it("guest cancel closes the VA at DOKU", async () => {
    const r = await book();
    await guestCancel(post(`/api/bookings/${r.booking.code}/cancel?t=${r.token}`, {}), ctx(r.booking.code));
    expect(fake.calls.filter((c) => c.path.endsWith("delete-va"))).toHaveLength(1);
  });
});

it("DOKU_ENV is the sandbox in tests", () => {
  expect(process.env.DOKU_CLIENT_ID).toBe(DOKU_ENV.DOKU_CLIENT_ID);
});
