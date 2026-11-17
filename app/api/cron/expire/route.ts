import { json } from "@/lib/server/http";
import { cronAuthorized, runExpire } from "@/lib/server/jobs";

/**
 * Every minute: expire lapsed payment holds and email `expired`.
 * Authorization: Bearer CRON_SECRET. GET for Vercel Cron, POST for curl.
 */
async function handle(req: Request) {
  if (!cronAuthorized(req)) return json({ ok: false, error: "unauthorized" }, 401);
  return json({ processed: await runExpire() });
}

export const GET = handle;
export const POST = handle;
