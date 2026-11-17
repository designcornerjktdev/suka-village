import { normalizeCode } from "@/lib/booking/promo";
import { db } from "@/lib/server/db";
import { clientIp, json, notFound, tooMany } from "@/lib/server/http";
import { toPromo } from "@/lib/server/mappers";
import { publicPromo } from "@/lib/server/public";
import { LIMITS, rateLimit } from "@/lib/server/ratelimit";

/** GET /api/promos/:code: the rules of one code the guest already typed (usePromo). */
export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  if (!(await rateLimit(`promo:${clientIp(req)}`, LIMITS.promoCheck))) return tooMany();
  const { code } = await params;
  const row = await db.promo.findUnique({ where: { code: normalizeCode(code) } });
  return row ? json(publicPromo(toPromo(row))) : notFound();
}
