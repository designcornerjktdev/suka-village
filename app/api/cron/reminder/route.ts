import { json } from "@/lib/server/http";
import { cronAuthorized, runReminders } from "@/lib/server/jobs";

/**
 * Daily, in the morning Jakarta time: the `reminder` email for confirmed
 * stays that start tomorrow. Authorization: Bearer CRON_SECRET. GET for
 * Vercel Cron, POST for curl.
 */
async function handle(req: Request) {
  if (!cronAuthorized(req)) return json({ ok: false, error: "unauthorized" }, 401);
  return json({ processed: await runReminders() });
}

export const GET = handle;
export const POST = handle;
