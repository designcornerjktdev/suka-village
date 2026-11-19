import { createHash, randomBytes } from "node:crypto";
import { db } from "./db";

/**
 * The order page without an account (docs/BOOKING.md §5). The link in every email
 * carries a random token; only its SHA-256 is stored, so a leaked database
 * opens no order page. Every email gets a fresh token and old ones stay valid.
 */

const hash = (token: string) => createHash("sha256").update(token).digest("hex");

export async function issueAccessToken(code: string): Promise<string> {
  const token = randomBytes(32).toString("base64url");
  await db.accessToken.create({ data: { hash: hash(token), bookingCode: code } });
  return token;
}

export async function verifyAccess(code: string, token: string | null | undefined): Promise<boolean> {
  if (!token) return false;
  const row = await db.accessToken.findUnique({ where: { hash: hash(token) }, select: { bookingCode: true } });
  return row?.bookingCode === code;
}
