import { db } from "./db";

/**
 * Fixed one-minute windows counted in the database (no Redis on shared
 * hosting). Returns false once `key` has had `limit` hits this minute.
 * Old windows are swept now and then.
 */
export async function rateLimit(key: string, limit: number, now = new Date()): Promise<boolean> {
  const windowStart = new Date(Math.floor(now.getTime() / 60_000) * 60_000);
  const row = await db.rateHit.upsert({
    where: { key_windowStart: { key, windowStart } },
    create: { key, windowStart, count: 1 },
    update: { count: { increment: 1 } },
  });
  if (Math.random() < 0.01) await db.rateHit.deleteMany({ where: { windowStart: { lt: new Date(windowStart.getTime() - 10 * 60_000) } } });
  return row.count <= limit;
}

/** Per-minute limits (BOOKING.md §2: rate-limit what can be guessed or abused). */
export const LIMITS = { promoCheck: 10, createBooking: 5, lookup: 5, login: 5 } as const;
