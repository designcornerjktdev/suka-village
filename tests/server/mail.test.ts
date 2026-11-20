import nodemailer, { type SendMailOptions, type Transporter } from "nodemailer";
import { beforeEach, describe, expect, it } from "vitest";
import { db } from "@/lib/server/db";
import { seedDatabase } from "@/lib/server/seed-db";
import { createBooking, markPaidByGateway } from "@/lib/server/bookings";
import { verifyAccess } from "@/lib/server/access";
import { sendTemplates } from "@/lib/server/mail";
import type { CreateInput } from "@/lib/booking/types";
import { resetDb } from "../setup";

type Sent = { from: string; to: string; subject: string; html: string; text: string };

/** A real nodemailer transport that keeps messages instead of sending them. */
function recorder() {
  const sent: Sent[] = [];
  const transport = nodemailer.createTransport({ jsonTransport: true });
  const original = transport.sendMail.bind(transport);
  transport.sendMail = (async (mail: SendMailOptions) => {
    const info = await original(mail);
    const m = JSON.parse(info.message as unknown as string);
    sent.push({ from: m.from.address ? `${m.from.name} <${m.from.address}>` : m.from, to: m.to[0].address, subject: m.subject, html: m.html, text: m.text });
    return info;
  }) as typeof transport.sendMail;
  return { transport, sent };
}

const failing = () => ({ sendMail: async () => { throw new Error("SMTP down"); } }) as unknown as Transporter;

const input = (over: Partial<CreateInput> = {}): CreateInput => ({
  checkIn: "2027-03-10",
  checkOut: "2027-03-12",
  units: ["mainVilla"],
  guests: 4,
  guest: { name: "Ana Wijaya", email: "ana@example.com", phone: "081234567890" },
  method: "va_bca",
  locale: "id",
  ...over,
});

async function booked(over: Partial<CreateInput> = {}) {
  const r = await createBooking(input(over));
  if (!r.ok) throw new Error(r.error);
  return r.booking.code;
}

beforeEach(async () => {
  await resetDb();
  await seedDatabase(db);
  await db.rate.updateMany({ data: { bookable: true } });
  process.env.SITE_URL = "https://sukavillage.com";
  process.env.MAIL_FROM = "Suka Village <reservasi@sukavillage.com>";
});

describe("sendTemplates", () => {
  it("sends in the booking language, from the sender, and logs it", async () => {
    const code = await booked({ locale: "en" });
    await markPaidByGateway(code, "g", new Date());
    await db.booking.update({ where: { code }, data: { status: "confirmed" } });
    const { transport, sent } = recorder();
    await sendTemplates(code, ["confirmed"], { transport });
    expect(sent).toHaveLength(1);
    expect(sent[0].to).toBe("ana@example.com");
    expect(sent[0].from).toBe("Suka Village <reservasi@sukavillage.com>");
    expect(sent[0].subject).toContain(code);
    expect(sent[0].html).toContain("https://sukavillage.com/en/booking/");
    expect(sent[0].text.length).toBeGreaterThan(0);
    const log = await db.notification.findMany({ where: { bookingCode: code } });
    expect(log).toMatchObject([{ template: "confirmed", to: "ana@example.com", status: "sent" }]);
  });

  it("without SMTP_URL nothing is sent and the log says unsent, not sent", async () => {
    const code = await booked();
    const before = process.env.SMTP_URL;
    delete process.env.SMTP_URL;
    try {
      await sendTemplates(code, ["awaiting_payment"]);
    } finally {
      if (before !== undefined) process.env.SMTP_URL = before;
    }
    const log = await db.notification.findMany({ where: { bookingCode: code } });
    expect(log).toMatchObject([{ template: "awaiting_payment", status: "unsent" }]);
  });

  it("the link in the email opens the order page", async () => {
    const code = await booked();
    const { transport, sent } = recorder();
    await sendTemplates(code, ["awaiting_payment"], { transport });
    const link = sent[0].html.match(/https:\/\/sukavillage\.com\/id\/booking\/[A-Z0-9-]+\?t=([A-Za-z0-9_-]+)/);
    expect(link).not.toBeNull();
    expect(await verifyAccess(code, link![1])).toBe(true);
  });

  it("uses the room names as edited in the admin", async () => {
    await db.room.update({ where: { unit: "mainVilla" }, data: { name: "Villa Utama" } });
    const code = await booked();
    const { transport, sent } = recorder();
    await sendTemplates(code, ["awaiting_payment"], { transport });
    expect(sent[0].html).toContain("Villa Utama");
  });

  it("a failing provider is logged as failed and never throws", async () => {
    const code = await booked();
    await expect(sendTemplates(code, ["awaiting_payment"], { transport: failing() })).resolves.toBeUndefined();
    expect(await db.notification.findMany({ where: { bookingCode: code } })).toMatchObject([{ template: "awaiting_payment", status: "failed" }]);
  });

  it("a booking without an email (taken by the admin over WhatsApp) sends nothing", async () => {
    const code = await booked({ source: "admin", guest: { name: "Budi", email: "", phone: "081234567890" } });
    const { transport, sent } = recorder();
    await sendTemplates(code, ["confirmed"], { transport });
    expect(sent).toHaveLength(0);
    expect(await db.notification.count()).toBe(0);
  });

  it("sends each template once, in order", async () => {
    const code = await booked();
    const { transport, sent } = recorder();
    await sendTemplates(code, ["payment_received", "confirmed"], { transport });
    expect(sent).toHaveLength(2);
    expect((await db.notification.findMany({ where: { bookingCode: code }, orderBy: { at: "asc" } })).map((n) => n.template)).toEqual(["payment_received", "confirmed"]);
  });
});
