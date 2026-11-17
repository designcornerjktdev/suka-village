import { withAdmin } from "@/lib/server/admin-route";
import { promoBody } from "@/lib/server/admin-schemas";
import { createPromo, listPromos } from "@/lib/server/catalog";
import { json, parseBody } from "@/lib/server/http";

/** GET /api/admin/promos (usePromos): every code, with the admin note. */
export const GET = withAdmin(async () => json(await listPromos()));

/** POST /api/admin/promos: { ok, promo } | { ok: false, error: "code" | "duplicate" | "value" }. */
export const POST = withAdmin(async (req) => {
  const body = await parseBody(req, promoBody);
  if (!body) return json({ ok: false, error: "value" }, 400);
  return json(await createPromo(body));
});
