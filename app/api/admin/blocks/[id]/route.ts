import { withAdmin } from "@/lib/server/admin-route";
import { blockBody } from "@/lib/server/admin-schemas";
import { deleteBlock, updateBlock } from "@/lib/server/blocks";
import { json, parseBody } from "@/lib/server/http";

type P = { id: string };

/** PUT /api/admin/blocks/:id: change room, dates, reason or note; overlaps refused. */
export const PUT = withAdmin<P>(async (req, _admin, { id }) => {
  const body = await parseBody(req, blockBody);
  if (!body) return json({ ok: false, error: "invalid" }, 400);
  const r = await updateBlock(id, body);
  return json(r, r.ok ? 200 : r.error === "not_found" ? 404 : r.error === "invalid" ? 400 : 200);
});

/** DELETE /api/admin/blocks/:id: "Buka kembali". */
export const DELETE = withAdmin<P>(async (_req, _admin, { id }) => {
  await deleteBlock(id);
  return json({ ok: true });
});
