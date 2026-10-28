import { place, social, whatsapp } from "@/content/site";
import type { Locale } from "@/content/i18n";
import type { Booking, Settings, TemplateId } from "./types";
import { fmtDate, idr } from "./format";
import { render, variablesFor } from "./notifications";

/**
 * The email the guest receives, as HTML: the owner's words (the template
 * edited in Pengaturan) inside one fixed layout, so every message looks like
 * Suka Village and carries the same facts in the same place.
 *
 *   logo
 *   status line (a coloured mark and a word: Terkonfirmasi, Menunggu ...)
 *   headline (the subject)
 *   the owner's message
 *   payment box (only while waiting for payment)
 *   booking summary: code, dates, rooms, guests, total "Termasuk pajak"
 *   one button (two for a stay that is confirmed or tomorrow)
 *   footer: address, WhatsApp, Instagram
 *
 * Built the way email clients need it: tables, inline styles, a 600px
 * column, system fonts (no web fonts in Gmail or Outlook), a PNG logo (SVG is
 * not shown in Gmail), square corners like the site. Server safe: no window,
 * no React. The developer sends `html` and `text` through the email provider.
 */

const C = {
  paper: "#ffffff",
  ink: "#1f2a24",
  soft: "#5a6359",
  forest: "#1f5c44",
  cream: "#f3eee4",
  rule: "#e6e1d6",
  clay: "#9c4e2c",
};
const FONT = "Helvetica, Arial, sans-serif";

type Tone = "forest" | "clay" | "soft";

const STATUS: Record<TemplateId, { tone: Tone; id: string; en: string }> = {
  awaiting_payment: { tone: "clay", id: "Menunggu pembayaran", en: "Awaiting payment" },
  payment_received: { tone: "forest", id: "Pembayaran diterima", en: "Payment received" },
  confirmed: { tone: "forest", id: "Terkonfirmasi", en: "Confirmed" },
  rejected: { tone: "clay", id: "Tidak dapat dikonfirmasi", en: "Not confirmed" },
  expired: { tone: "soft", id: "Waktu bayar habis", en: "Payment time ran out" },
  cancelled: { tone: "soft", id: "Dibatalkan", en: "Cancelled" },
  reminder: { tone: "forest", id: "Besok menginap", en: "Your stay is tomorrow" },
};

const T = {
  id: {
    summary: "Ringkasan pesanan",
    code: "Kode pesanan",
    checkIn: "Check-in",
    checkOut: "Check-out",
    stay: "Lama menginap",
    nights: "{n} malam",
    rooms: "Kamar",
    guests: "Tamu",
    guestsN: "{n} orang",
    promo: "Promo {code}",
    total: "Total",
    paid: "Total dibayar",
    refund: "Dikembalikan",
    tax: "Termasuk pajak",
    payTitle: "Cara bayar",
    payBy: "Bayar sebelum",
    pay: "Bayar sekarang",
    view: "Lihat status pesanan",
    details: "Lihat detail pesanan",
    directions: "Petunjuk arah",
    again: "Lihat pesanan",
    auto: "Email ini dikirim otomatis. Ada pertanyaan? Balas email ini atau hubungi kami di WhatsApp.",
  },
  en: {
    summary: "Booking summary",
    code: "Booking code",
    checkIn: "Check in",
    checkOut: "Check out",
    stay: "Length of stay",
    nights: "{n} nights",
    rooms: "Rooms",
    guests: "Guests",
    guestsN: "{n}",
    promo: "Promo {code}",
    total: "Total",
    paid: "Total paid",
    refund: "Refunded",
    tax: "Tax included",
    payTitle: "How to pay",
    payBy: "Pay before",
    pay: "Pay now",
    view: "View booking status",
    details: "View booking details",
    directions: "Directions",
    again: "View booking",
    auto: "This email was sent automatically. Questions? Reply to this email or message us on WhatsApp.",
  },
} satisfies Record<Locale, Record<string, string>>;

const esc = (s: string) => s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

/** The owner's text: paragraphs on blank lines, line breaks kept, links clickable. */
function paragraphs(text: string) {
  return text
    .trim()
    .split(/\n{2,}/)
    .map((p) => {
      const html = esc(p)
        .replace(/https?:\/\/[^\s<]+/g, (url) => `<a href="${url}" style="color:${C.forest};text-decoration:underline;word-break:break-all;">${url}</a>`)
        .replace(/\n/g, "<br>");
      return `<p style="margin:0 0 16px;font:15px/1.6 ${FONT};color:${C.ink};">${html}</p>`;
    })
    .join("");
}

function button(href: string, label: string, primary: boolean) {
  const bg = primary ? C.forest : C.paper;
  const fg = primary ? C.paper : C.forest;
  return `<a href="${esc(href)}" style="display:inline-block;padding:14px 22px;background:${bg};border:1px solid ${C.forest};color:${fg};font:600 14px/1.2 ${FONT};text-decoration:none;">${esc(label)}</a>`;
}

function row(label: string, value: string, opts: { strong?: boolean; note?: string; color?: string } = {}) {
  const size = opts.strong ? "18px" : "14px";
  const weight = opts.strong ? "700" : "400";
  const note = opts.note ? `<br><span style="font:12px/1.4 ${FONT};color:${C.soft};">${esc(opts.note)}</span>` : "";
  const top = opts.strong ? `border-top:1px solid ${C.ink};padding-top:14px;` : "";
  return `<tr>
    <td style="${top}padding-bottom:10px;font:${opts.strong ? "600 " : ""}14px/1.4 ${FONT};color:${opts.strong ? C.ink : C.soft};vertical-align:top;">${esc(label)}${note}</td>
    <td align="right" style="${top}padding-bottom:10px;padding-left:16px;font:${weight} ${size}/1.4 ${FONT};color:${opts.color ?? C.ink};vertical-align:top;">${esc(value)}</td>
  </tr>`;
}

export function bookingEmail({
  booking: b,
  template,
  settings,
  locale,
  origin,
  roomName,
}: {
  booking: Booking;
  template: TemplateId;
  settings: Settings;
  locale: Locale;
  /** Where the site lives; the logo and the links point here. */
  origin: string;
  roomName?: (id: string) => string;
}) {
  const t = T[locale];
  const vars = variablesFor(b, locale, origin, roomName);
  const tpl = settings.templates[template];
  const subject = render(tpl.subject[locale], vars);
  const text = render(tpl.email[locale], vars);
  const status = STATUS[template];
  const tone = { forest: C.forest, clay: C.clay, soft: C.soft }[status.tone];
  const n = (s: string, v: number | string) => s.replace("{n}", String(v));

  /* The first sentence after the greeting, as the inbox preview line. */
  const preheader = text.split(/\n{2,}/)[1]?.replace(/\s+/g, " ").slice(0, 140) ?? "";

  const totalLabel = template === "rejected" ? t.refund : template === "awaiting_payment" ? t.total : t.paid;
  const summary = [
    row(t.code, b.code),
    row(t.checkIn, fmtDate(b.checkIn, locale, "long")),
    row(t.checkOut, fmtDate(b.checkOut, locale, "long")),
    row(t.stay, n(t.nights, b.quote.nights)),
    row(t.rooms, vars.kamar),
    row(t.guests, n(t.guestsN, b.guests)),
    b.quote.discount ? row(t.promo.replace("{code}", b.quote.promo?.code ?? ""), `−${idr(b.quote.discount)}`, { color: C.forest }) : "",
    row(totalLabel, idr(b.quote.total), { strong: true, note: t.tax }),
  ].join("");

  const payBox =
    template === "awaiting_payment"
      ? `<tr><td class="sv-pad" style="padding:0 40px 28px;">
          <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};">
            <tr><td style="padding:20px 22px;">
              <p style="margin:0 0 10px;font:600 11px/1.4 ${FONT};letter-spacing:0.14em;text-transform:uppercase;color:${C.soft};">${esc(t.payTitle)}</p>
              <p style="margin:0;font:600 15px/1.5 ${FONT};color:${C.ink};">${esc(vars.metode)}</p>
              ${vars.referensi ? `<p style="margin:4px 0 0;font:15px/1.5 ${FONT};color:${C.ink};">${esc(vars.referensi)}</p>` : ""}
              <p style="margin:12px 0 0;font:14px/1.5 ${FONT};color:${C.clay};">${esc(t.payBy)} <strong>${esc(vars.batas)}</strong></p>
            </td></tr>
          </table>
        </td></tr>`
      : "";

  const actions: [string, string][] =
    template === "awaiting_payment"
      ? [[vars.link, t.pay]]
      : template === "confirmed"
        ? [[vars.link, t.details], [vars.peta, t.directions]]
        : template === "reminder"
          ? [[vars.peta, t.directions], [vars.link, t.again]]
          : [[vars.link, t.view]];
  const buttons = actions
    .map(([href, label], i) => `<td style="padding:0 12px 12px 0;">${button(href, label, i === 0)}</td>`)
    .join("");

  const phone = `+${whatsapp.number.slice(0, 2)} ${whatsapp.number.slice(2, 5)}-${whatsapp.number.slice(5, 9)}-${whatsapp.number.slice(9)}`;

  const html = `<!doctype html>
<html lang="${locale}">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<title>${esc(subject)}</title>
<style>
  @media (max-width: 620px) {
    .sv-pad { padding-left: 24px !important; padding-right: 24px !important; }
    .sv-h1 { font-size: 24px !important; }
  }
  a { color: ${C.forest}; }
</style>
</head>
<body style="margin:0;padding:0;background:${C.cream};">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;">${esc(preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:${C.cream};">
  <tr><td align="center" style="padding:32px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" style="width:100%;max-width:600px;background:${C.paper};">

      <tr><td class="sv-pad" style="padding:32px 40px 24px;border-bottom:1px solid ${C.rule};">
        <a href="${esc(origin)}/${locale}"><img src="${esc(origin)}/brand/suka-village-logo-green-email.png" width="75" height="56" alt="Suka Village" style="display:block;border:0;"></a>
      </td></tr>

      <tr><td class="sv-pad" style="padding:32px 40px 8px;">
        <p style="margin:0 0 14px;font:600 11px/1.4 ${FONT};letter-spacing:0.14em;text-transform:uppercase;color:${tone};">
          <span style="display:inline-block;width:7px;height:7px;margin-right:8px;vertical-align:1px;background:${tone};"></span>${esc(status[locale])}
        </p>
        <h1 class="sv-h1" style="margin:0 0 24px;font:400 28px/1.2 ${FONT};letter-spacing:-0.01em;color:${C.forest};">${esc(subject).replace(/(SV-[A-Z0-9]+)/g, '<span style="white-space:nowrap;">$1</span>')}</h1>
        ${paragraphs(text)}
      </td></tr>

      ${payBox}

      <tr><td class="sv-pad" style="padding:8px 40px 8px;">
        <p style="margin:0 0 14px;font:600 11px/1.4 ${FONT};letter-spacing:0.14em;text-transform:uppercase;color:${C.soft};">${esc(t.summary)}</p>
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0">${summary}</table>
      </td></tr>

      <tr><td class="sv-pad" style="padding:20px 40px 28px;">
        <table role="presentation" cellpadding="0" cellspacing="0"><tr>${buttons}</tr></table>
      </td></tr>

      <tr><td class="sv-pad" style="padding:24px 40px 32px;background:${C.forest};">
        <p style="margin:0 0 6px;font:600 14px/1.5 ${FONT};color:${C.paper};">Suka Village</p>
        <p style="margin:0 0 14px;font:13px/1.6 ${FONT};color:#d6e0d9;">${esc(place.address)}</p>
        <p style="margin:0 0 18px;font:13px/1.6 ${FONT};color:${C.paper};">
          <a href="https://wa.me/${whatsapp.number}" style="color:${C.paper};text-decoration:underline;">WhatsApp ${esc(phone)}</a>
          &nbsp;·&nbsp;
          <a href="${esc(social.instagram)}" style="color:${C.paper};text-decoration:underline;">Instagram ${esc(social.handle)}</a>
        </p>
        <p style="margin:0;font:12px/1.6 ${FONT};color:#c9d6cd;">${esc(t.auto)}</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body>
</html>`;

  return { subject, html, text };
}
