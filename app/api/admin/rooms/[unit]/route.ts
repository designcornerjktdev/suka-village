import type { Feature } from "@/lib/booking/types";
import { withAdmin } from "@/lib/server/admin-route";
import { roomBody } from "@/lib/server/admin-schemas";
import { archiveRoom, saveRoom } from "@/lib/server/catalog";
import { json, notFound, parseBody } from "@/lib/server/http";

type P = { unit: string };

/** PUT /api/admin/rooms/:unit: name, size, rooms, features, description, photos; refreshes the room pages. */
export const PUT = withAdmin<P>(async (req, _admin, { unit }) => {
  const body = await parseBody(req, roomBody);
  if (!body || body.unit !== unit) return json({ ok: false, error: "invalid" }, 400);
  return (await saveRoom({ ...body, features: body.features as Feature[] })) ? json({ ok: true }) : notFound();
});

/** DELETE /api/admin/rooms/:unit: archive; refused with the codes of bookings still to come. */
export const DELETE = withAdmin<P>(async (_req, _admin, { unit }) => json(await archiveRoom(unit)));
