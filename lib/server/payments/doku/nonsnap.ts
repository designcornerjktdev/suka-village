import { createHash, createHmac, randomUUID } from "node:crypto";
import { DokuError } from "./client";
import { dokuConfig } from "./config";

/**
 * DOKU Non-SNAP requests (cards: the hosted Payment Page). Same Client ID and
 * Secret Key as SNAP, a different signature (DOKU signature component guide):
 *
 *   Client-Id:<id>\nRequest-Id:<id>\nRequest-Timestamp:<UTC Z>\n
 *   Request-Target:<path>\nDigest:<base64 sha256(body)>   (Digest only for POST)
 *
 *   Signature: HMACSHA256=<base64 HMAC-SHA256(secretKey, components)>
 *
 * DOKU signs its notifications the same way, with Request-Target = the path
 * of our notification URL.
 */

/** ISO 8601 UTC with Z and no milliseconds. */
export const nonSnapTimestamp = (now = new Date()) => now.toISOString().slice(0, 19) + "Z";

export type NonSnapComponents = { clientId: string; requestId: string; timestamp: string; target: string; body?: string };

export function signNonSnap(secretKey: string, c: NonSnapComponents): string {
  const lines = [`Client-Id:${c.clientId}`, `Request-Id:${c.requestId}`, `Request-Timestamp:${c.timestamp}`, `Request-Target:${c.target}`];
  if (c.body !== undefined) lines.push(`Digest:${createHash("sha256").update(c.body, "utf8").digest("base64")}`);
  return `HMACSHA256=${createHmac("sha256", secretKey).update(lines.join("\n")).digest("base64")}`;
}

/** A signed Non-SNAP request. Throws DokuError on a non-2xx answer. */
export async function nonSnapRequest<T = Record<string, unknown>>(method: "GET" | "POST", path: string, body?: unknown): Promise<T> {
  const c = dokuConfig();
  const raw = body === undefined ? undefined : JSON.stringify(body);
  const requestId = randomUUID();
  const timestamp = nonSnapTimestamp();
  const res = await fetch(`${c.baseUrl}${path}`, {
    method,
    headers: {
      ...(raw ? { "Content-Type": "application/json" } : {}),
      "Client-Id": c.clientId,
      "Request-Id": requestId,
      "Request-Timestamp": timestamp,
      Signature: signNonSnap(c.secretKey, { clientId: c.clientId, requestId, timestamp, target: path, body: method === "POST" ? raw : undefined }),
    },
    body: raw,
  });
  const data = (await res.json().catch(() => ({}))) as T & { error?: { code?: string; message?: string } };
  if (!res.ok) throw new DokuError(data.error?.code ?? String(res.status), data.error?.message ?? "request failed", res.status);
  return data;
}
