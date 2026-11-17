import { z } from "zod";
import { withAdmin } from "@/lib/server/admin-route";
import { createRoom, listRooms } from "@/lib/server/catalog";
import { json, parseBody } from "@/lib/server/http";

/** GET /api/admin/rooms: every room, archived ones too (old bookings still name them), and every rate. */
export const GET = withAdmin(async () => json(await listRooms()));

const body = z.object({ name: z.string().max(120).default("") });

/** POST /api/admin/rooms {name}: a new room, empty and off sale (createRoom → the Room). */
export const POST = withAdmin(async (req) => {
  const input = await parseBody(req, body);
  if (!input) return json({ ok: false, error: "invalid" }, 400);
  return json(await createRoom(input.name));
});
