import { applyPromo } from "@/lib/booking/promo";
import { quote } from "@/lib/booking/pricing";
import { clientIp, json, parseBody, tooMany } from "@/lib/server/http";
import { toRate } from "@/lib/server/mappers";
import { findUsablePromo } from "@/lib/server/promos";
import { publicPromo } from "@/lib/server/public";
import { LIMITS, rateLimit } from "@/lib/server/ratelimit";
import { promoCheckBody } from "@/lib/server/schemas";
import { jakartaToday } from "@/lib/server/time";
import { runTx } from "@/lib/server/tx";

/** POST /api/promos/check: the checkout "Pakai" button (checkPromo). Rate limited; never lists codes. */
export async function POST(req: Request) {
  if (!(await rateLimit(`promo:${clientIp(req)}`, LIMITS.promoCheck))) return tooMany();
  const body = await parseBody(req, promoCheckBody);
  if (!body || !(body.checkOut > body.checkIn)) return json({ ok: false, error: "not_found" });
  const result = await runTx(async (tx) => {
    const found = await findUsablePromo(tx, body.code, { ...body, today: jakartaToday() });
    if (!found.ok) return { ok: false as const, error: found.error };
    const rates = (await tx.rate.findMany({ where: { unit: { in: body.units } } })).map(toRate);
    return { ok: true as const, promo: publicPromo(found.promo), quote: applyPromo(quote(rates, body.checkIn, body.checkOut, body.units), found.promo) };
  });
  return json(result);
}
