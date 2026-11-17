import { withAdmin } from "@/lib/server/admin-route";
import { promoBody } from "@/lib/server/admin-schemas";
import { deletePromo, savePromo } from "@/lib/server/catalog";
import { json, parseBody } from "@/lib/server/http";

type P = { id: string };

/** PUT /api/admin/promos/:id: bookings that already used it keep their discount. */
export const PUT = withAdmin<P>(async (req, _admin, { id }) => {
  const body = await parseBody(req, promoBody);
  if (!body) return json({ ok: false, error: "value" }, 400);
  const r = await savePromo(id, body);
  return json(r, !r.ok && r.error === "not_found" ? 404 : 200);
});

/** DELETE /api/admin/promos/:id: bookings that used it keep their discount. */
export const DELETE = withAdmin<P>(async (_req, _admin, { id }) => {
  await deletePromo(id);
  return json({ ok: true });
});
