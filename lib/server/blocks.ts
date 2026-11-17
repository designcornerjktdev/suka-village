import type { Block as BlockRow } from "@prisma/client";
import type { Block, BlockReason, ISODate } from "@/lib/booking/types";
import { nightsOf } from "@/lib/booking/format";
import { db } from "./db";
import { isUniqueViolation } from "./errors";
import { fromDay, toDay } from "./mappers";
import { claimNights, releaseNights } from "./nights";
import type { Tx } from "./tx";

/**
 * Dates closed by hand in Admin → Kalender (sold elsewhere, repairs, the
 * owner's own use). A block takes its nights in the same Night table as
 * bookings, so one unique index keeps both from overlapping.
 */

export type BlockInput = { unit: string; from: ISODate; to: ISODate; reason: BlockReason; note?: string };
export type BlockResult = { ok: true; block: Block } | { ok: false; clash?: ISODate; error?: "invalid" | "not_found" };

export const toBlock = (r: BlockRow): Block => ({
  id: r.id,
  unit: r.unit,
  from: toDay(r.from),
  to: toDay(r.to),
  reason: r.reason as BlockReason,
  ...(r.note ? { note: r.note } : {}),
});

/** The first night of `nights` already taken in `unit`. */
async function firstClash(tx: Tx, unit: string, nights: ISODate[]) {
  const row = await tx.night.findFirst({ where: { unit, date: { in: nights.map(fromDay) } }, orderBy: { date: "asc" }, select: { date: true } });
  return row ? toDay(row.date) : undefined;
}

class Clash extends Error {
  constructor(readonly date: ISODate | undefined) {
    super("clash");
  }
}

async function validUnit(tx: Tx, unit: string) {
  return !!(await tx.room.findFirst({ where: { unit, archived: false }, select: { unit: true } }));
}

async function claim(tx: Tx, input: BlockInput, blockId: string) {
  const nights = nightsOf(input.from, input.to);
  const r = await claimNights(tx, [input.unit], nights, { blockId });
  if (!r.ok) throw new Clash(await firstClash(tx, input.unit, nights));
}

async function guarded(run: () => Promise<BlockResult>, input: BlockInput): Promise<BlockResult> {
  try {
    return await run();
  } catch (e) {
    if (e instanceof Clash) return { ok: false, clash: e.date };
    if (isUniqueViolation(e)) return { ok: false, clash: await db.$transaction((tx) => firstClash(tx, input.unit, nightsOf(input.from, input.to))) };
    throw e;
  }
}

export function createBlock(input: BlockInput): Promise<BlockResult> {
  if (!(input.to > input.from)) return Promise.resolve({ ok: false, error: "invalid" });
  return guarded(
    () =>
      db.$transaction(async (tx) => {
        if (!(await validUnit(tx, input.unit))) return { ok: false as const, error: "invalid" as const };
        const row = await tx.block.create({ data: { unit: input.unit, from: fromDay(input.from), to: fromDay(input.to), reason: input.reason, note: input.note?.trim() || null } });
        await claim(tx, input, row.id);
        return { ok: true as const, block: toBlock(row) };
      }),
    input,
  );
}

export function updateBlock(id: string, input: BlockInput): Promise<BlockResult> {
  if (!(input.to > input.from)) return Promise.resolve({ ok: false, error: "invalid" });
  return guarded(
    () =>
      db.$transaction(async (tx) => {
        if (!(await tx.block.findUnique({ where: { id } }))) return { ok: false as const, error: "not_found" as const };
        if (!(await validUnit(tx, input.unit))) return { ok: false as const, error: "invalid" as const };
        await releaseNights(tx, { blockId: id });
        const row = await tx.block.update({ where: { id }, data: { unit: input.unit, from: fromDay(input.from), to: fromDay(input.to), reason: input.reason, note: input.note?.trim() || null } });
        await claim(tx, input, id);
        return { ok: true as const, block: toBlock(row) };
      }),
    input,
  );
}

/** Opens the dates again (the block's nights go with it). */
export async function deleteBlock(id: string) {
  await db.block.deleteMany({ where: { id } });
}

export async function listBlocks(): Promise<Block[]> {
  return (await db.block.findMany({ orderBy: [{ from: "asc" }, { unit: "asc" }] })).map(toBlock);
}
