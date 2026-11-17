import type { ISODate } from "@/lib/booking/types";

/** The property's calendar day (Asia/Jakarta, UTC+7, no daylight saving),
    whatever time zone the server runs in. */
export function jakartaToday(now = new Date()): ISODate {
  return new Date(now.getTime() + 7 * 60 * 60_000).toISOString().slice(0, 10);
}
