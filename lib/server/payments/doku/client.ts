import { randomInt } from "node:crypto";
import { dokuConfig, snapPrivateKey } from "./config";
import { signAsymmetric, signSymmetric, snapTimestamp } from "./snap";

/**
 * Calls to DOKU's SNAP API: a B2B access token (cached until shortly before
 * it expires) and signed transaction requests.
 */

export class DokuError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly status = 0,
  ) {
    super(`DOKU ${code}: ${message}`);
    this.name = "DokuError";
  }
}

let cached: { token: string; until: number } | null = null;

/** Tests, and a key rotation: forget the cached token. */
export function resetDokuClient() {
  cached = null;
}

async function accessToken(force = false): Promise<string> {
  if (!force && cached && cached.until > Date.now()) return cached.token;
  const c = dokuConfig();
  const timestamp = snapTimestamp();
  const res = await fetch(`${c.baseUrl}/authorization/v1/access-token/b2b`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-CLIENT-KEY": c.clientId,
      "X-TIMESTAMP": timestamp,
      "X-SIGNATURE": signAsymmetric(snapPrivateKey(c), c.clientId, timestamp),
    },
    body: JSON.stringify({ grantType: "client_credentials" }),
  });
  const data = (await res.json().catch(() => ({}))) as { accessToken?: string; expiresIn?: number; responseCode?: string; responseMessage?: string };
  if (!res.ok || !data.accessToken) throw new DokuError(data.responseCode ?? String(res.status), data.responseMessage ?? "token request failed", res.status);
  /* Renew a minute early so a request never goes out on a token about to lapse. */
  cached = { token: data.accessToken, until: Date.now() + ((data.expiresIn ?? 900) - 60) * 1000 };
  return data.accessToken;
}

/** Numeric, unique within the day (SNAP X-EXTERNAL-ID). */
const externalId = () => `${Date.now()}${randomInt(100000, 999999)}`;

export type RequestOptions = {
  /** CHANNEL-ID header: "H2H" for VA and QRIS; null to leave it out (direct debit / e-wallet). */
  channelId?: string | null;
  /** The guest's address, for e-wallet payments (X-IP-ADDRESS). */
  ip?: string;
};

/** A signed SNAP transaction request. Throws DokuError unless DOKU answers 2xx. */
export async function dokuRequest<T = Record<string, unknown>>(method: "POST" | "DELETE" | "PUT", path: string, body: unknown, opts: RequestOptions = {}): Promise<T> {
  const channelId = opts.channelId === undefined ? "H2H" : opts.channelId;
  const c = dokuConfig();
  const raw = JSON.stringify(body);
  for (let attempt = 0; ; attempt++) {
    const token = await accessToken(attempt > 0);
    const timestamp = snapTimestamp();
    const res = await fetch(`${c.baseUrl}${path}`, {
      method,
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
        "X-TIMESTAMP": timestamp,
        "X-SIGNATURE": signSymmetric(c.secretKey, method, path, token, raw, timestamp),
        "X-PARTNER-ID": c.clientId,
        "X-EXTERNAL-ID": externalId(),
        ...(channelId ? { "CHANNEL-ID": channelId } : {}),
        ...(opts.ip ? { "X-IP-ADDRESS": opts.ip } : {}),
      },
      body: raw,
    });
    const data = (await res.json().catch(() => ({}))) as T & { responseCode?: string; responseMessage?: string };
    /* A token DOKU no longer accepts: fetch a fresh one and try once more. */
    if (res.status === 401 && attempt === 0 && /token/i.test(data.responseMessage ?? "")) continue;
    if (!res.ok || (data.responseCode && !data.responseCode.startsWith("2"))) {
      throw new DokuError(data.responseCode ?? String(res.status), data.responseMessage ?? "request failed", res.status);
    }
    return data;
  }
}
