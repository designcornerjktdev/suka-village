import { withAdmin } from "@/lib/server/admin-route";
import { rateBody } from "@/lib/server/admin-schemas";
import { saveRate } from "@/lib/server/catalog";
import { json, notFound, parseBody } from "@/lib/server/http";

/** PUT /api/admin/rates/:unit: weekday and weekend rates, seasons, minimum nights, bookable online. */
export const PUT = withAdmin<{ unit: string }>(async (req, _admin, { unit }) => {
  const body = await parseBody(req, rateBody);
  if (!body || body.unit !== unit) return json({ ok: false, error: "invalid" }, 400);
  return (await saveRate(body)) ? json({ ok: true }) : notFound();
});
