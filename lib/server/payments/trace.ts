/**
 * One log line per request DOKU sends us: which path it hit and which of the
 * headers we check are present (never their values), so a failed sandbox
 * payment shows where the chain broke.
 */
const WATCHED = ["authorization", "x-client-key", "x-partner-id", "x-timestamp", "x-signature", "x-external-id", "channel-id", "client-id", "signature"];

export function traceDokuRequest(kind: string, req: Request) {
  const present = WATCHED.filter((h) => req.headers.has(h));
  console.info(`[payments] ${kind} ${req.method} ${new URL(req.url).pathname} headers: ${present.join(", ") || "(none)"}`);
}
