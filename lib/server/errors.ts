import { Prisma } from "@prisma/client";

/** A unique index refused the write (Prisma P2002), on Postgres and MySQL alike. */
export function isUniqueViolation(e: unknown): boolean {
  return e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";
}
