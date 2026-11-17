import { db } from "@/lib/server/db";
import { json } from "@/lib/server/http";
import { toRate, toRoom } from "@/lib/server/mappers";

/** GET /api/rooms: the rooms on sale as edited in the admin, and their public rates (useRooms, useRates). */
export async function GET() {
  const rows = await db.room.findMany({ where: { archived: false }, orderBy: { position: "asc" }, include: { rate: true } });
  return json({
    rooms: rows.map(toRoom),
    rates: rows.flatMap((r) => (r.rate ? [toRate(r.rate)] : [])),
  });
}
