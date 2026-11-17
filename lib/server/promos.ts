import type { Promo, PromoError, UnitId } from "@/lib/booking/types";
import { HOLDING } from "@/lib/booking/types";
import { normalizeCode, promoProblem } from "@/lib/booking/promo";
import { nightsOf } from "@/lib/booking/format";
import { toPromo } from "./mappers";
import type { Tx } from "./tx";

export type PromoLookup = { ok: true; promo: Promo } | { ok: false; error: PromoError; promo?: Promo };

/**
 * Looks a code up and checks it against a stay, inside the booking
 * transaction. The promo row is LOCKED first (a no-op update takes a row lock
 * on Postgres and MySQL alike), so two bookings racing for the last use of a
 * code are counted one after the other and only one gets it.
 *
 * Uses are bookings that still hold their nights; call expireLapsed() earlier
 * in the same transaction so a lapsed hold has already given its use back.
 */
export async function findUsablePromo(
  tx: Tx,
  code: string,
  ctx: { checkIn: string; checkOut: string; units: UnitId[]; today: string },
): Promise<PromoLookup> {
  const found = await tx.promo.findUnique({ where: { code: normalizeCode(code) } });
  if (!found) return { ok: false, error: "not_found" };
  const locked = await tx.promo.update({ where: { id: found.id }, data: { active: found.active } });
  const promo = toPromo(locked);
  const uses = await tx.booking.count({ where: { promoId: promo.id, status: { in: HOLDING }, deletedAt: null } });
  const problem = promoProblem(promo, { nights: nightsOf(ctx.checkIn, ctx.checkOut).length, units: ctx.units, today: ctx.today, uses });
  return problem ? { ok: false, error: problem, promo } : { ok: true, promo };
}
