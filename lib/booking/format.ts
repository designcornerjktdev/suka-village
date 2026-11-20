import type { Locale } from "@/content/i18n";
import type { ISODate } from "./types";

/** Rupiah, whole numbers, the way Indonesian receipts print it: Rp 1.250.000 */
const idrFormat = new Intl.NumberFormat("id-ID", { style: "currency", currency: "IDR", maximumFractionDigits: 0 });
export const idr = (n: number) => idrFormat.format(n).replace(/ /g, " ");

/** Local calendar day as yyyy-mm-dd. */
export function iso(d: Date): ISODate {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

/** yyyy-mm-dd read as a LOCAL date (new Date("yyyy-mm-dd") is UTC midnight). */
export function day(s: ISODate) {
  const [y, m, d] = s.split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(s: ISODate, n: number): ISODate {
  const d = day(s);
  d.setDate(d.getDate() + n);
  return iso(d);
}

export function todayISO(): ISODate {
  return iso(new Date());
}

export function nightsOf(checkIn: ISODate, checkOut: ISODate): ISODate[] {
  const out: ISODate[] = [];
  for (let d = checkIn; d < checkOut; d = addDays(d, 1)) out.push(d);
  return out;
}

/** Friday and Saturday nights are weekend nights. */
export function isWeekendNight(s: ISODate) {
  const w = day(s).getDay();
  return w === 5 || w === 6;
}

export function fmtDate(s: ISODate, locale: Locale, style: "short" | "long" | "day" = "long") {
  const opts: Intl.DateTimeFormatOptions =
    style === "short"
      ? { day: "numeric", month: "short" }
      : style === "day"
        ? { weekday: "short", day: "numeric", month: "short" }
        : { weekday: "long", day: "numeric", month: "long", year: "numeric" };
  return day(s).toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", opts);
}

/* Times are the property's (Sukabumi, WIB), not the machine's: the server runs
   on UTC, so without this an email said 08.11 for a 15.11 payment deadline. */
const PROPERTY_TZ = "Asia/Jakarta";

export function fmtDateTime(s: string, locale: Locale) {
  return new Date(s).toLocaleString(locale === "id" ? "id-ID" : "en-GB", {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: PROPERTY_TZ,
  });
}

export function fmtTime(s: string, locale: Locale) {
  return new Date(s).toLocaleTimeString(locale === "id" ? "id-ID" : "en-GB", { hour: "2-digit", minute: "2-digit", timeZone: PROPERTY_TZ });
}

/* --- Contact details ----------------------------------------------------- */

export function isValidEmail(s: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(s.trim());
}

/**
 * An Indonesian mobile number in any of the ways people type it
 * (0812..., 812..., +62 812..., 62-812-...) as E.164, or null.
 */
export function normalizePhone(raw: string): string | null {
  let digits = raw.replace(/[^\d]/g, "");
  if (digits.startsWith("62")) digits = digits.slice(2);
  if (digits.startsWith("0")) digits = digits.slice(1);
  if (!/^8\d{7,11}$/.test(digits)) return null;
  return `+62${digits}`;
}

/** +6281234567890 as +62 812-3456-7890 */
export function formatPhone(e164: string) {
  const local = e164.replace(/^\+62/, "");
  const parts = [local.slice(0, 3), local.slice(3, 7), local.slice(7)].filter(Boolean);
  return `+62 ${parts.join("-")}`;
}

/* --- Identifiers --------------------------------------------------------- */

/** No 0/O, 1/I/L: a code read aloud over the phone survives. */
const ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";

export function randomCode(length = 6) {
  let out = "";
  const bytes = new Uint32Array(length);
  crypto.getRandomValues(bytes);
  for (const b of bytes) out += ALPHABET[b % ALPHABET.length];
  return out;
}

export const bookingCode = () => `SV-${randomCode(6)}`;

export const uid = () => randomCode(10);
