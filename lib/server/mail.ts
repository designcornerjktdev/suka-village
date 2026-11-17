import nodemailer, { type Transporter } from "nodemailer";
import type { Locale } from "@/content/i18n";
import type { TemplateId } from "@/lib/booking/types";
import { bookingEmail } from "@/lib/booking/email";
import { issueAccessToken } from "./access";
import { findBooking, readSettings } from "./bookings";
import { db } from "./db";

/**
 * Automatic emails (BOOKING.md §4). Rendered by lib/booking/email.ts exactly
 * as the admin previews them, in the booking's language, with a fresh access
 * token in the links. Every attempt is logged in Notification as sent or
 * failed; a failure never throws, so an email problem never undoes a booking.
 *
 * Call AFTER the transaction that changed the booking has committed.
 */

let shared: Transporter | null = null;

/** SMTP_URL, e.g. smtps://user:pass@smtp.resend.com:465 (Resend) or Hostinger mail. */
function defaultTransport(): Transporter {
  if (!shared) {
    const url = process.env.SMTP_URL;
    /* Without SMTP configured (local dev), messages are rendered and logged, not delivered. */
    shared = url ? nodemailer.createTransport(url) : nodemailer.createTransport({ jsonTransport: true });
  }
  return shared;
}

/** The site address for links and the logo. */
export const siteOrigin = () => (process.env.SITE_URL || "http://localhost:3000").replace(/\/$/, "");

export async function sendTemplates(code: string, templates: TemplateId[], deps: { transport?: Transporter } = {}): Promise<void> {
  if (!templates.length) return;
  const transport = deps.transport ?? defaultTransport();
  for (const template of templates) {
    const booking = await findBooking(code);
    if (!booking?.guest.email) return;
    const to = booking.guest.email;
    let status: "sent" | "failed" = "failed";
    try {
      const [settings, rooms, token] = await Promise.all([readSettings(), db.room.findMany({ select: { unit: true, name: true } }), issueAccessToken(code)]);
      const names = new Map(rooms.map((r) => [r.unit, r.name]));
      const mail = bookingEmail({
        booking,
        template,
        settings,
        locale: booking.locale as Locale,
        origin: siteOrigin(),
        roomName: (id) => names.get(id) ?? id,
        token,
      });
      const from = settings.contact.senderEmail ? `Suka Village <${settings.contact.senderEmail}>` : process.env.MAIL_FROM;
      await transport.sendMail({ from, to, subject: mail.subject, html: mail.html, text: mail.text });
      status = "sent";
    } catch (e) {
      console.error(`[mail] ${template} to booking ${code} failed:`, e);
    }
    await db.notification.create({ data: { bookingCode: code, template, to, status } });
  }
}

/* --- Alerts to the admins ----------------------------------------------------
   For things someone at the property must act on that the admin screens do
   not show by themselves (a refund owed on money that arrived late). Plain
   text, to every admin account. */

let alertTransport: Transporter | null = null;

/** Tests: where admin alerts go (null for the normal transport). */
export function setAdminAlertTransport(t: Transporter | null) {
  alertTransport = t;
}

/** Emails every admin. Returns how many were reached; never throws. */
export async function sendAdminAlert(subject: string, text: string): Promise<number> {
  const transport = alertTransport ?? defaultTransport();
  const admins = await db.admin.findMany({ select: { email: true } });
  const settings = await readSettings().catch(() => null);
  const from = settings?.contact.senderEmail ? `Suka Village <${settings.contact.senderEmail}>` : process.env.MAIL_FROM;
  let reached = 0;
  for (const { email } of admins) {
    try {
      await transport.sendMail({ from, to: email, subject, text });
      reached++;
    } catch (e) {
      console.error(`[mail] admin alert to ${email} failed:`, e);
    }
  }
  return reached;
}
