import argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { normalizeUsername } from "./admins";
import { db } from "./db";

/**
 * Admin sign-in (docs/BOOKING.md §6), by email or username; no roles. A session is a random
 * token in an httpOnly cookie; the database keeps only its SHA-256, so a
 * leaked table opens no session. Every /api/admin/* handler calls
 * requireAdmin; the (panel) layout checks the session on the server too.
 */

export const ADMIN_COOKIE = "sv_admin";
export const SESSION_DAYS = 14;

/** `tokenHash` identifies the session in use (changing one's password keeps it). */
export type AdminUser = { adminId: string; email: string; displayName: string; tokenHash: string };

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

/* Verified against when the account is unknown, so a wrong email or username
   takes as long as a wrong password and the timing says nothing about who has
   an account. */
let dummyHash: Promise<string> | null = null;
const dummy = () => (dummyHash ??= argon2.hash("not-a-real-password-suka-village"));

/** `identifier` is an email when it contains "@", else a username. */
export async function login(identifier: string, password: string): Promise<{ token: string; expiresAt: Date; email: string } | null> {
  const id = normalizeUsername(identifier);
  const admin = id.includes("@") ? await db.admin.findUnique({ where: { email: id } }) : id ? await db.admin.findUnique({ where: { username: id } }) : null;
  const ok = await argon2.verify(admin?.passwordHash ?? (await dummy()), password).catch(() => false);
  if (!admin || !ok) return null;
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + SESSION_DAYS * 24 * 3600_000);
  await db.session.create({ data: { tokenHash: hash(token), adminId: admin.id, expiresAt } });
  return { token, expiresAt, email: admin.email };
}

export async function getAdmin(token: string | null | undefined): Promise<AdminUser | null> {
  if (!token) return null;
  const tokenHash = hash(token);
  const s = await db.session.findUnique({ where: { tokenHash }, include: { admin: { select: { id: true, email: true, displayName: true } } } });
  if (!s || s.expiresAt <= new Date()) return null;
  return { adminId: s.admin.id, email: s.admin.email, displayName: s.admin.displayName || s.admin.email, tokenHash };
}

export async function logout(token: string | null | undefined) {
  if (token) await db.session.deleteMany({ where: { tokenHash: hash(token) } });
}

/** The session token from a request's Cookie header. */
export function tokenFromRequest(req: Request): string | null {
  const header = req.headers.get("cookie") ?? "";
  for (const part of header.split(";")) {
    const [k, ...v] = part.trim().split("=");
    if (k === ADMIN_COOKIE) return decodeURIComponent(v.join("="));
  }
  return null;
}

/** Use at the top of every /api/admin/* handler: the admin, or a 401 to return. */
export async function requireAdmin(req: Request): Promise<AdminUser | Response> {
  const admin = await getAdmin(tokenFromRequest(req));
  return admin ?? Response.json({ ok: false, error: "unauthorized" }, { status: 401 });
}

/** Set-Cookie value. Secure on production (HTTPS); plain on localhost so dev works. */
export function sessionCookie(token: string, maxAgeSeconds: number) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${ADMIN_COOKIE}=${encodeURIComponent(token)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAgeSeconds}${secure}`;
}
