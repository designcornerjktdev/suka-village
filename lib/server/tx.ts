import { Prisma } from "@prisma/client";
import { db } from "./db";

/** The client handed to a $transaction callback. */
export type Tx = Prisma.TransactionClient;

/** How many times a transaction is retried after a deadlock or write conflict. */
const RETRIES = 3;

/** Prisma P2034: "Transaction failed due to a write conflict or a deadlock". */
function isConflict(e: unknown) {
  if (e instanceof Prisma.PrismaClientKnownRequestError) {
    if (e.code === "P2034") return true;
    /* MariaDB/MySQL may surface the raw error inside another code. */
    return /deadlock|lock wait timeout|1213|1205/i.test(e.message);
  }
  return false;
}

/**
 * Every transaction that counts or guards something (bookings, promo quota,
 * status changes, blocks) goes through here:
 *
 *  - READ COMMITTED, explicitly. MariaDB/MySQL default to REPEATABLE READ,
 *    where a count after taking a row lock still reads the snapshot from the
 *    start of the transaction: two bookings racing for a quota-1 promo would
 *    both see 0 uses. Postgres defaults to READ COMMITTED already.
 *  - A deadlock or write conflict (two guests taking overlapping nights at
 *    once) is retried; the database rolled the losing transaction back, so a
 *    retry starts clean and then sees the winner's rows.
 *
 * Errors the callback throws on purpose (refusals) pass straight through.
 */
export async function runTx<T>(fn: (tx: Tx) => Promise<T>): Promise<T> {
  for (let attempt = 0; ; attempt++) {
    try {
      return await db.$transaction(fn, { isolationLevel: Prisma.TransactionIsolationLevel.ReadCommitted, maxWait: 10_000, timeout: 20_000 });
    } catch (e) {
      if (attempt < RETRIES && isConflict(e)) {
        /* A short random pause, so the retries do not collide again. */
        await new Promise((r) => setTimeout(r, 20 + Math.random() * 80 * (attempt + 1)));
        continue;
      }
      throw e;
    }
  }
}
