import { withAdmin } from "@/lib/server/admin-route";
import { settingsBody } from "@/lib/server/admin-schemas";
import { readSettingsRow, saveSettings } from "@/lib/server/catalog";
import { json, parseBody } from "@/lib/server/http";

/** GET /api/admin/settings (useSettings in the admin): payment methods, hold time, email templates, policy, contact. */
export const GET = withAdmin(async () => json(await readSettingsRow()));

/** PUT /api/admin/settings: the whole settings object, checked (hold 15 minutes to 24 hours). */
export const PUT = withAdmin(async (req) => {
  const body = await parseBody(req, settingsBody);
  if (!body) return json({ ok: false, error: "invalid" }, 400);
  await saveSettings(body);
  return json({ ok: true });
});
