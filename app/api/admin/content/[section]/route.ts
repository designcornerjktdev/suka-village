import { z } from "zod";
import type { ContentSection } from "@/lib/booking/types";
import { withAdmin } from "@/lib/server/admin-route";
import { contentItemBody, SECTIONS } from "@/lib/server/admin-schemas";
import { saveContent } from "@/lib/server/catalog";
import { json, parseBody } from "@/lib/server/http";

const body = z.array(contentItemBody).max(500);

/** PUT /api/admin/content/:section [items]: the section as it should be, in page order; refreshes the public page. */
export const PUT = withAdmin<{ section: string }>(async (req, _admin, { section }) => {
  if (!(SECTIONS as readonly string[]).includes(section)) return json({ ok: false, error: "invalid" }, 400);
  const items = await parseBody(req, body);
  if (!items || new Set(items.map((i) => i.id)).size !== items.length) return json({ ok: false, error: "invalid" }, 400);
  await saveContent(section as ContentSection, items);
  return json({ ok: true });
});
