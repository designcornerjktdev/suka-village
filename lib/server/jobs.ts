import { timingSafeEqual } from "node:crypto";
import { addDays } from "@/lib/booking/format";
import { expireLapsed } from "./bookings";
import { notifyChannel } from "./channel";
import { db } from "./db";
import { sendTemplates } from "./mail";
import { fromDay } from "./mappers";
import { jakartaToday } from "./time";
import { runTx } from "./tx";

/**
 * The two scheduled jobs (docs/BOOKING.md §1, §4), called by the host's scheduler
 * through /api/cron/* (Vercel Cron, Hostinger hPanel cron, or crontab).
 *
 * Both are safe to run late, twice, or at the same time: an email is sent
 * only if the booking has no notification of that kind yet.
 */

/**
 * Every minute: pending bookings past their payment window become expired
 * (nights and promo uses given back), and every expired booking that has not
 * had its `expired` email gets it, including ones a booking transaction
 * expired first (createBooking also calls expireLapsed). Returns how many
 * were emailed.
 */
export async function runExpire(now = new Date()): Promise<number> {
  await runTx((tx) => expireLapsed(tx, now));
  const due = await db.booking.findMany({
    where: { status: "expired", deletedAt: null, guestEmail: { not: "" }, notifications: { none: { template: "expired" } } },
    select: { code: true },
  });
  for (const { code } of due) {
    await sendTemplates(code, ["expired"]);
    /* Its nights are free again: the channel (BookandLink, later) is told here,
       once per booking, whoever expired it. */
    await notifyChannel({ kind: "booking", code, holds: false });
  }
  return due.length;
}

/**
 * Daily (morning, Jakarta): confirmed stays whose check-in is tomorrow, by the
 * property's calendar, get the `reminder` email once. Returns how many.
 */
export async function runReminders(now = new Date()): Promise<number> {
  const tomorrow = addDays(jakartaToday(now), 1);
  const due = await db.booking.findMany({
    where: { status: "confirmed", deletedAt: null, checkIn: fromDay(tomorrow), guestEmail: { not: "" }, notifications: { none: { template: "reminder" } } },
    select: { code: true },
  });
  for (const { code } of due) await sendTemplates(code, ["reminder"]);
  return due.length;
}

/** Bearer CRON_SECRET, compared in constant time. An unset secret refuses everything. */
export function cronAuthorized(req: Request): boolean {
  const secret = process.env.CRON_SECRET ?? "";
  if (secret.length < 16) return false;
  const given = Buffer.from((req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, ""));
  const want = Buffer.from(secret);
  return given.length === want.length && timingSafeEqual(given, want);
}
