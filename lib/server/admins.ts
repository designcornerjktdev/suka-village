import argon2 from "argon2";
import { Prisma, type PrismaClient } from "@prisma/client";
import { isValidEmail } from "@/lib/booking/format";

/**
 * Admin accounts (docs/superpowers/specs/2026-11-19-user-management-design.md):
 * email, username (optional for accounts made before usernames), display name,
 * argon2 password hash. No roles: every admin may do everything.
 */

/** Shortest password an admin may have. */
export const MIN_PASSWORD = 10;

/** Lower-case letters, digits, dot, underscore, hyphen; never "@", so login can tell it from an email. */
const USERNAME = /^[a-z0-9._-]{3,32}$/;
const MAX_DISPLAY_NAME = 80;

export type AdminError = "email" | "username" | "displayName" | "password" | "exists" | "self" | "notFound" | "current";

export type AdminRow = { id: string; email: string; username: string | null; displayName: string; createdAt: string };

export type AdminProfile = { email: string; username: string; displayName: string };

type Fail<E extends AdminError = AdminError> = { ok: false; error: E };

export const normalizeUsername = (raw: string) => raw.trim().toLowerCase();
const normalizeEmail = (raw: string) => raw.trim().toLowerCase();

const toRow = (a: { id: string; email: string; username: string | null; displayName: string; createdAt: Date }): AdminRow => ({
  id: a.id,
  email: a.email,
  username: a.username,
  displayName: a.displayName,
  createdAt: a.createdAt.toISOString(),
});

const ROW = { id: true, email: true, username: true, displayName: true, createdAt: true } as const;

/** Normalized profile, or the first field that is wrong. */
function checkProfile(input: AdminProfile): { ok: true; value: AdminProfile } | Fail {
  const email = normalizeEmail(input.email);
  const username = normalizeUsername(input.username);
  const displayName = input.displayName.trim();
  if (!isValidEmail(email)) return { ok: false, error: "email" };
  if (!USERNAME.test(username)) return { ok: false, error: "username" };
  if (!displayName || displayName.length > MAX_DISPLAY_NAME) return { ok: false, error: "displayName" };
  return { ok: true, value: { email, username, displayName } };
}

/** Whether another admin (not `exceptId`) already has this email or username. */
async function taken(db: PrismaClient, p: AdminProfile, exceptId?: string) {
  const other = await db.admin.findFirst({ where: { OR: [{ email: p.email }, { username: p.username }], ...(exceptId ? { NOT: { id: exceptId } } : {}) } });
  return !!other;
}

/** The unique index caught a duplicate the pre-check missed (two saves at once): answer "exists", not a 500. */
const isDuplicate = (e: unknown) => e instanceof Prisma.PrismaClientKnownRequestError && e.code === "P2002";

export async function createAdmin(db: PrismaClient, input: AdminProfile & { password: string }): Promise<{ ok: true; admin: AdminRow } | Fail> {
  const p = checkProfile(input);
  if (!p.ok) return p;
  if (input.password.length < MIN_PASSWORD) return { ok: false, error: "password" };
  if (await taken(db, p.value)) return { ok: false, error: "exists" };
  try {
    const admin = await db.admin.create({ data: { ...p.value, passwordHash: await argon2.hash(input.password) }, select: ROW });
    return { ok: true, admin: toRow(admin) };
  } catch (e) {
    if (isDuplicate(e)) return { ok: false, error: "exists" };
    throw e;
  }
}

export async function listAdmins(db: PrismaClient): Promise<AdminRow[]> {
  return (await db.admin.findMany({ orderBy: { createdAt: "asc" }, select: ROW })).map(toRow);
}

export async function updateAdmin(db: PrismaClient, id: string, input: AdminProfile): Promise<{ ok: true; admin: AdminRow } | Fail> {
  if (!(await db.admin.findUnique({ where: { id } }))) return { ok: false, error: "notFound" };
  const p = checkProfile(input);
  if (!p.ok) return p;
  if (await taken(db, p.value, id)) return { ok: false, error: "exists" };
  try {
    return { ok: true, admin: toRow(await db.admin.update({ where: { id }, data: p.value, select: ROW })) };
  } catch (e) {
    if (isDuplicate(e)) return { ok: false, error: "exists" };
    throw e;
  }
}

/** Never one's own account, so at least one admin always remains. Their sessions go with them (cascade). */
export async function deleteAdmin(db: PrismaClient, id: string, actorId: string): Promise<{ ok: true } | Fail<"self" | "notFound">> {
  if (id === actorId) return { ok: false, error: "self" };
  const { count } = await db.admin.deleteMany({ where: { id } });
  return count ? { ok: true } : { ok: false, error: "notFound" };
}

/** Another admin's password, set by an admin; that admin is signed out everywhere. */
export async function resetPassword(db: PrismaClient, id: string, password: string): Promise<{ ok: true } | Fail<"password" | "notFound">> {
  if (password.length < MIN_PASSWORD) return { ok: false, error: "password" };
  if (!(await db.admin.findUnique({ where: { id } }))) return { ok: false, error: "notFound" };
  const passwordHash = await argon2.hash(password);
  await db.$transaction([db.admin.update({ where: { id }, data: { passwordHash } }), db.session.deleteMany({ where: { adminId: id } })]);
  return { ok: true };
}

/** One's own password: needs the current one; every other session of this admin ends, `keepTokenHash` stays. */
export async function changeOwnPassword(db: PrismaClient, id: string, current: string, next: string, keepTokenHash: string): Promise<{ ok: true } | Fail<"current" | "password">> {
  const admin = await db.admin.findUnique({ where: { id } });
  if (!admin || !(await argon2.verify(admin.passwordHash, current).catch(() => false))) return { ok: false, error: "current" };
  if (next.length < MIN_PASSWORD) return { ok: false, error: "password" };
  const passwordHash = await argon2.hash(next);
  await db.$transaction([
    db.admin.update({ where: { id }, data: { passwordHash } }),
    db.session.deleteMany({ where: { adminId: id, NOT: { tokenHash: keepTokenHash } } }),
  ]);
  return { ok: true };
}
