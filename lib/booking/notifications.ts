import { place, units } from "@/content/site";
import type { Locale } from "@/content/i18n";
import type { Booking, Template, TemplateId } from "./types";
import { fmtDate, fmtDateTime, idr } from "./format";
import { methodInfo } from "./payments";

/**
 * Messages sent to the guest at each step. EMAIL ONLY, by the owner's
 * decision: automatic WhatsApp needs the paid Business Platform, and email
 * does the job. (The admin can still open a WhatsApp chat with a guest by
 * hand from the booking; that costs nothing and is not part of this.)
 *
 *   awaiting_payment  right after the booking is created
 *   payment_received  when the gateway reports the payment: now waiting for
 *                     the admin to accept
 *   confirmed         when the admin accepts
 *   rejected          when the admin rejects (a refund is owed)
 *   expired           when the payment window closes unpaid
 *   cancelled         when the guest or the admin cancels
 *   reminder          the day before check in (a scheduled job)
 *
 * Templates are editable in the admin, in Indonesian and English; `{name}`
 * style variables are filled by `render`. In production the server sends
 * these through a transactional email provider.
 */

export const VARIABLES = [
  "nama",
  "kode",
  "checkin",
  "checkout",
  "malam",
  "kamar",
  "tamu",
  "total",
  "metode",
  "referensi",
  "batas",
  "alasan",
  "link",
  "peta",
] as const;

export const TEMPLATE_LABELS: Record<TemplateId, string> = {
  awaiting_payment: "Menunggu pembayaran",
  payment_received: "Pembayaran diterima, menunggu konfirmasi",
  confirmed: "Pesanan dikonfirmasi",
  rejected: "Pesanan ditolak",
  expired: "Waktu bayar habis",
  cancelled: "Dibatalkan",
  reminder: "Pengingat H-1",
};

/**
 * The owner's words only. The email layout (email.ts) already shows the
 * booking summary, the total, how to pay, and the buttons to the booking and
 * the map, so the text does not repeat them. Bump TEMPLATES_REV when these
 * change, so a stored demo takes the new wording.
 */
export const TEMPLATES_REV = 2;

export const DEFAULT_TEMPLATES: Record<TemplateId, Template> = {
  awaiting_payment: {
    subject: {
      id: "Selesaikan pembayaran pesanan {kode}",
      en: "Complete the payment for booking {kode}",
    },
    email: {
      id: "Halo {nama},\n\nTerima kasih sudah memesan di Suka Village. Kamar Anda kami tahan sampai {batas}. Selesaikan pembayaran sebelum waktu itu, supaya pesanan tidak batal otomatis.\n\nSalam hangat,\nSuka Village",
      en: "Hello {nama},\n\nThank you for booking Suka Village. We are holding your room until {batas}. Please complete the payment before then, so the booking is not cancelled automatically.\n\nWarm regards,\nSuka Village",
    },
  },
  payment_received: {
    subject: {
      id: "Pembayaran pesanan {kode} sudah kami terima",
      en: "We have received your payment for booking {kode}",
    },
    email: {
      id: "Halo {nama},\n\nPembayaran sebesar {total} untuk pesanan {kode} sudah kami terima. Terima kasih.\n\nTim kami sedang memeriksa pesanan Anda. Begitu dikonfirmasi, Anda akan menerima email berikutnya.\n\nSalam hangat,\nSuka Village",
      en: "Hello {nama},\n\nWe have received your payment of {total} for booking {kode}. Thank you.\n\nOur team is now reviewing your booking. You will get another email as soon as it is confirmed.\n\nWarm regards,\nSuka Village",
    },
  },
  confirmed: {
    subject: { id: "Pesanan {kode} terkonfirmasi", en: "Booking {kode} confirmed" },
    email: {
      id: "Halo {nama},\n\nPesanan {kode} sudah dikonfirmasi. Kamar Anda siap, dan kami menantikan kedatangan Anda.\n\nSampai jumpa di Suka Village.",
      en: "Hello {nama},\n\nBooking {kode} is confirmed. Your room is ready, and we look forward to welcoming you.\n\nSee you at Suka Village.",
    },
  },
  rejected: {
    subject: {
      id: "Pesanan {kode} tidak dapat kami konfirmasi",
      en: "We could not confirm booking {kode}",
    },
    email: {
      id: "Halo {nama},\n\nMohon maaf, pesanan {kode} untuk {checkin} sampai {checkout} tidak dapat kami konfirmasi.\n\nAlasan: {alasan}\n\nPembayaran Anda sebesar {total} akan kami kembalikan sepenuhnya. Tim kami akan menghubungi Anda untuk prosesnya.\n\nSekali lagi mohon maaf,\nSuka Village",
      en: "Hello {nama},\n\nWe are sorry: we could not confirm booking {kode} for {checkin} to {checkout}.\n\nReason: {alasan}\n\nYour payment of {total} will be refunded in full. Our team will be in touch about the refund.\n\nWith our apologies,\nSuka Village",
    },
  },
  expired: {
    subject: { id: "Waktu pembayaran pesanan {kode} habis", en: "Payment time for booking {kode} has run out" },
    email: {
      id: "Halo {nama},\n\nWaktu pembayaran untuk pesanan {kode} sudah habis, jadi kamar kami lepas. Kalau masih ingin menginap, tanggal yang sama mungkin masih kosong.\n\nSuka Village",
      en: "Hello {nama},\n\nThe payment time for booking {kode} has run out, so the room has been released. If you would still like to stay, the same dates may still be open.\n\nSuka Village",
    },
  },
  cancelled: {
    subject: { id: "Pesanan {kode} dibatalkan", en: "Booking {kode} cancelled" },
    email: {
      id: "Halo {nama},\n\nPesanan {kode} untuk {checkin} sampai {checkout} sudah dibatalkan. Kalau ini keliru, balas email ini.\n\nSuka Village",
      en: "Hello {nama},\n\nBooking {kode} for {checkin} to {checkout} has been cancelled. If this is a mistake, reply to this email.\n\nSuka Village",
    },
  },
  reminder: {
    subject: { id: "Besok Anda menginap di Suka Village", en: "Your stay at Suka Village starts tomorrow" },
    email: {
      id: "Halo {nama},\n\nBesok, {checkin}, Anda menginap di Suka Village. Petunjuk arah ada di tombol di bawah.\n\nSampai jumpa besok.",
      en: "Hello {nama},\n\nTomorrow, {checkin}, you are staying at Suka Village. Directions are on the button below.\n\nSee you tomorrow.",
    },
  },
};

export function variablesFor(
  b: Booking,
  locale: Locale,
  origin: string,
  roomName: (id: string) => string = (id) => units.find((x) => x.id === id)?.name ?? id,
  /** The order page access token (server emails only). Without it the link
      opens "Cek pesanan"; previews in the admin leave it out. */
  token?: string,
): Record<(typeof VARIABLES)[number], string> {
  const method = methodInfo(b.payment.method);
  const reference =
    method.group === "va"
      ? `${locale === "id" ? "Nomor VA" : "VA number"} ${method.bank}: ${b.payment.reference}`
      : method.group === "qris"
        ? locale === "id"
          ? "Kode QRIS ada di halaman status pesanan."
          : "The QRIS code is on the booking status page."
        : "";
  return {
    nama: b.guest.name.split(" ")[0] || b.guest.name,
    kode: b.code,
    checkin: fmtDate(b.checkIn, locale, "day"),
    checkout: fmtDate(b.checkOut, locale, "day"),
    malam: String(b.quote.nights),
    kamar: b.units.map(roomName).join(", "),
    tamu: String(b.guests),
    total: idr(b.quote.total),
    metode: method.label,
    referensi: reference,
    batas: fmtDateTime(b.payment.expiresAt, locale),
    alasan: b.rejectReason || (locale === "id" ? "Tanggal tidak tersedia." : "The dates are not available."),
    link: `${origin}/${locale}/booking/${b.code}${token ? `?t=${encodeURIComponent(token)}` : ""}`,
    peta: place.mapHref,
  };
}

export function render(text: string, vars: Record<string, string>) {
  return text.replace(/\{(\w+)\}/g, (all, k: string) => vars[k] ?? all).replace(/\n{3,}/g, "\n\n");
}
