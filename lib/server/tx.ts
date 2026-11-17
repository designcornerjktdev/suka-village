import type { Prisma } from "@prisma/client";

/** The client handed to a $transaction callback. */
export type Tx = Prisma.TransactionClient;
