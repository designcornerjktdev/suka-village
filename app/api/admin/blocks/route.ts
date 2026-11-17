import { withAdmin } from "@/lib/server/admin-route";
import { blockBody } from "@/lib/server/admin-schemas";
import { createBlock, listBlocks } from "@/lib/server/blocks";
import { json, parseBody } from "@/lib/server/http";

/** GET /api/admin/blocks (useBlocks): every date closed by hand. */
export const GET = withAdmin(async () => json(await listBlocks()));

/** POST /api/admin/blocks: close dates; an overlap with a booking or a block answers { ok: false, clash }. */
export const POST = withAdmin(async (req) => {
  const body = await parseBody(req, blockBody);
  if (!body) return json({ ok: false, error: "invalid" }, 400);
  const r = await createBlock(body);
  return json(r, !r.ok && r.error === "invalid" ? 400 : 200);
});
