import type { Locale } from "@/content/i18n";

/** yyyy-mm-dd in local time, for URLs and <input> values. */
export function toISO(d: Date) {
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${d.getFullYear()}-${m}-${day}`;
}

/** Parses yyyy-mm-dd as a LOCAL date. `new Date("2026-10-03")` is UTC midnight,
    which lands on the previous day for anyone west of Greenwich. */
export function fromISO(s: string | null | undefined) {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return undefined;
  const [y, m, d] = s.split("-").map(Number);
  const out = new Date(y, m - 1, d);
  return Number.isNaN(out.getTime()) ? undefined : out;
}

export function nightsBetween(a: Date, b: Date) {
  return Math.round((b.getTime() - a.getTime()) / 86_400_000);
}

export function formatShort(d: Date, locale: Locale) {
  return d.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
    day: "numeric",
    month: "short",
  });
}

export function formatLong(d: Date, locale: Locale) {
  return d.toLocaleDateString(locale === "id" ? "id-ID" : "en-GB", {
    weekday: "short",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function startOfToday() {
  const d = new Date();
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}
