import { PrismaClient } from "@prisma/client";

/* One client per process. In dev, Next reloads modules on every change; keeping
   the client on globalThis stops each reload from opening a new pool. */
const globalForDb = globalThis as unknown as { db?: PrismaClient };

export const db = globalForDb.db ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") globalForDb.db = db;
