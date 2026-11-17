import { publicSettings, readSettingsRow } from "@/lib/server/catalog";
import { json } from "@/lib/server/http";

/**
 * GET /api/settings (useSettings on guests' pages): payment methods on offer,
 * hold time, cancellation policy, WhatsApp, and the email templates (the
 * order page previews the emails the guest was sent). Not the sender address.
 */
export async function GET() {
  return json(publicSettings(await readSettingsRow()));
}
