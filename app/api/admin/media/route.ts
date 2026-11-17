import { withAdmin } from "@/lib/server/admin-route";
import { mediaBody } from "@/lib/server/admin-schemas";
import { readMedia, saveMedia } from "@/lib/server/catalog";
import { json, parseBody } from "@/lib/server/http";

/** GET /api/admin/media (useMediaMeta): name and alt text (ID/EN) per photograph, by src. */
export const GET = withAdmin(async () => json(await readMedia()));

/**
 * PUT /api/admin/media {src, meta}: a photo's name and alt text (saveMedia).
 * The src goes in the body, not the path: it is itself a path (/photos/...).
 */
export const PUT = withAdmin(async (req) => {
  const body = await parseBody(req, mediaBody);
  if (!body) return json({ ok: false, error: "invalid" }, 400);
  await saveMedia(body.src, body.meta);
  return json({ ok: true });
});
