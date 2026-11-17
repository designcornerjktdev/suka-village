import type { ISODate, UnitId } from "@/lib/booking/types";
import { fromDay } from "./mappers";
import type { Tx } from "./tx";

/**
 * The double-booking guard. A taken night is one row in `Night`, unique per
 * (unit, date). Claiming inserts the rows inside the caller's transaction; a
 * second transaction claiming the same night either sees the row (and says
 * which rooms clash) or, in a race, is refused by the unique index and rolls
 * back (createBooking turns that into "unavailable").
 */

export type NightOwner = { bookingCode: string } | { blockId: string };

/** Rooms among `units` that already have one of `nights` taken. */
export async function takenUnits(tx: Tx, units: UnitId[], nights: ISODate[]): Promise<UnitId[]> {
  if (!units.length || !nights.length) return [];
  const rows = await tx.night.findMany({
    where: { unit: { in: units }, date: { in: nights.map(fromDay) } },
    select: { unit: true },
    distinct: ["unit"],
  });
  const taken = new Set(rows.map((r) => r.unit));
  return units.filter((u) => taken.has(u));
}

export async function claimNights(
  tx: Tx,
  units: UnitId[],
  nights: ISODate[],
  owner: NightOwner,
): Promise<{ ok: true } | { ok: false; units: UnitId[] }> {
  const clash = await takenUnits(tx, units, nights);
  if (clash.length) return { ok: false, units: clash };
  await tx.night.createMany({
    data: units.flatMap((unit) => nights.map((date) => ({ unit, date: fromDay(date), ...owner }))),
  });
  return { ok: true };
}

/** Frees every night a booking or block holds. */
export async function releaseNights(tx: Tx, owner: NightOwner) {
  await tx.night.deleteMany({ where: owner });
}
