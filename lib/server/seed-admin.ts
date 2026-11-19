import { randomBytes } from "node:crypto";
import type { PrismaClient } from "@prisma/client";
import { createAdmin } from "./admins";

/**
 * The first admin account, made by `npm run db:seed` only while there is no
 * admin at all, so a second seed never adds one and an owner's accounts are
 * never touched. Always "admin" / admin@sukavillage.com / "Admin"; those are
 * changed later under Pengguna. The password comes from SEED_ADMIN_PASSWORD,
 * or a random one is made and handed back to print once: a fixed default
 * would be the same on every server and easy to forget in production.
 */

/** process.env, or the same key in a test. */
export type SeedAdminEnv = { SEED_ADMIN_PASSWORD?: string; [key: string]: string | undefined };

export type SeedAdminResult = { created: false } | { created: true; username: string; email: string; generatedPassword: string | null };

export async function seedFirstAdmin(db: PrismaClient, env: SeedAdminEnv): Promise<SeedAdminResult> {
  if (await db.admin.count()) return { created: false };
  const given = env.SEED_ADMIN_PASSWORD?.trim();
  const password = given || randomBytes(12).toString("base64url");
  const r = await createAdmin(db, {
    email: "admin@sukavillage.com",
    username: "admin",
    displayName: "Admin",
    password,
  });
  if (!r.ok) throw new Error(`SEED_ADMIN_PASSWORD refused: ${r.error}`);
  return { created: true, username: r.admin.username ?? "", email: r.admin.email, generatedPassword: given ? null : password };
}
