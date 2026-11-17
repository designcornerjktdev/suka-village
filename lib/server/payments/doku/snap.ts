import { createHash, createHmac, createSign, createVerify, timingSafeEqual } from "node:crypto";

/**
 * DOKU SNAP (Bank Indonesia standard) signatures, as DOKU's own Node library
 * (github.com/PTNUSASATUINTIARTHA-DOKU/doku-nodejs-library) builds them:
 *
 *  - Get Token B2B, both ways: SHA256withRSA over `clientId|timestamp`, base64.
 *    We sign with OUR private key when we ask DOKU for a token; DOKU signs with
 *    ITS private key when it asks us for one before sending a notification.
 *  - Transactions: HMAC-SHA512(secretKey, `METHOD:path:accessToken:
 *    lowercase hex sha256(body):timestamp`), base64. The body is hashed
 *    exactly as sent (JSON.stringify), keeping spaces inside values.
 *  - The token we give DOKU is a JWT (RS256) signed with our private key;
 *    DOKU sends it back as `Authorization: Bearer` on the notification.
 */

/** `yyyy-MM-ddTHH:mm:ss+07:00`, Jakarta time, whatever zone the server runs in. */
export function snapTimestamp(now = new Date()): string {
  return new Date(now.getTime() + 7 * 60 * 60_000).toISOString().slice(0, 19) + "+07:00";
}

export function signAsymmetric(privateKeyPem: string, clientId: string, timestamp: string): string {
  return createSign("RSA-SHA256").update(`${clientId}|${timestamp}`, "utf8").sign(privateKeyPem, "base64");
}

export function verifyAsymmetric(publicKeyPem: string, clientId: string, timestamp: string, signature: string): boolean {
  try {
    return createVerify("RSA-SHA256").update(`${clientId}|${timestamp}`, "utf8").verify(publicKeyPem, Buffer.from(signature, "base64"));
  } catch {
    return false;
  }
}

export const sha256Hex = (s: string) => createHash("sha256").update(s, "utf8").digest("hex").toLowerCase();

/** `body` is the exact string sent on the wire. */
export function signSymmetric(secretKey: string, method: string, path: string, accessToken: string, body: string, timestamp: string): string {
  return createHmac("sha512", Buffer.from(secretKey, "utf8"))
    .update(`${method}:${path}:${accessToken}:${sha256Hex(body)}:${timestamp}`)
    .digest("base64");
}

/** Constant-time comparison of two base64 signatures. */
export function sameSignature(a: string, b: string): boolean {
  const x = Buffer.from(a);
  const y = Buffer.from(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const b64url = (s: string | Buffer) => Buffer.from(s).toString("base64url");

/** The token DOKU fetches from us before it notifies; valid `expiresIn` seconds. */
export function issueNotificationToken(privateKeyPem: string, clientId: string, expiresIn: number, now = new Date()): string {
  const header = b64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const payload = b64url(JSON.stringify({ exp: Math.floor(now.getTime() / 1000) + expiresIn, issuer: "suka-village", clientId }));
  const signature = createSign("RSA-SHA256").update(`${header}.${payload}`).sign(privateKeyPem, "base64url");
  return `${header}.${payload}.${signature}`;
}

export function verifyNotificationToken(publicKeyPem: string, token: string, now = new Date()): boolean {
  const parts = token.split(".");
  if (parts.length !== 3) return false;
  const [header, payload, signature] = parts;
  try {
    if (JSON.parse(Buffer.from(header, "base64url").toString()).alg !== "RS256") return false;
    if (!createVerify("RSA-SHA256").update(`${header}.${payload}`).verify(publicKeyPem, Buffer.from(signature, "base64url"))) return false;
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString());
    return typeof exp === "number" && exp * 1000 > now.getTime();
  } catch {
    return false;
  }
}
