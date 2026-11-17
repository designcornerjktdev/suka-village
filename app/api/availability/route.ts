import { db } from "@/lib/server/db";
import { json } from "@/lib/server/http";
import { fromDay, toDay } from "@/lib/server/mappers";

const DAY = /^\d{4}-\d{2}-\d{2}$/;

/**
 * GET /api/availability?from&to: taken nights per room (useOccupancy).
 * Dates only, never who holds them. A pending booking past its payment
 * window no longer counts, even before the cron job has expired it.
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams;
  const from = q.get("from");
  const to = q.get("to");
  const range = {
    ...(from && DAY.test(from) ? { gte: fromDay(from) } : {}),
    ...(to && DAY.test(to) ? { lt: fromDay(to) } : {}),
  };
  const rows = await db.night.findMany({
    where: {
      ...(Object.keys(range).length ? { date: range } : {}),
      OR: [{ bookingCode: null }, { booking: { NOT: { status: "pending", payment: { expiresAt: { lte: new Date() } } } } }],
    },
    select: { unit: true, date: true },
    orderBy: [{ unit: "asc" }, { date: "asc" }],
  });
  const occupancy: Record<string, string[]> = {};
  for (const r of rows) (occupancy[r.unit] ??= []).push(toDay(r.date));
  return json({ occupancy });
}
