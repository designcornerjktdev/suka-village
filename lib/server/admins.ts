import argon2 from "argon2";
import type { PrismaClient } from "@prisma/client";
import { isValidEmail } from "@/lib/booking/format";

/** Shortest password an admin may have. */
export const MIN_PASSWORD = 10;

export type CreateAdminResult = { ok: true; email: string } | { ok: false; error: "email" | "password" | "exists" };

/** Adds an admin account (there are two at launch; no roles). */
export async function createAdmin(db: PrismaClient, rawEmail: string, password: string): Promise<CreateAdminResult> {
  const email = rawEmail.trim().toLowerCase();
  if (!isValidEmail(email)) return { ok: false, error: "email" };
  if (password.length < MIN_PASSWORD) return { ok: false, error: "password" };
  if (await db.admin.findUnique({ where: { email } })) return { ok: false, error: "exists" };
  await db.admin.create({ data: { email, passwordHash: await argon2.hash(password) } });
  return { ok: true, email };
}
