import { withAdmin } from "@/lib/server/admin-route";
import { json } from "@/lib/server/http";
import { MAX_UPLOAD_BYTES, putUpload } from "@/lib/server/storage";

/**
 * POST /api/admin/uploads (multipart, field "file"): one photograph from the
 * admin's photo manager (putUpload). Answers { ok, src, name } or
 * { ok: false, error, name }, exactly as the prototype did.
 */
export const POST = withAdmin(async (req) => {
  let file: File | null = null;
  try {
    const f = (await req.formData()).get("file");
    file = f instanceof File ? f : null;
  } catch {
    file = null;
  }
  if (!file) return json({ ok: false, error: "unreadable", name: "" }, 400);
  const name = file.name;
  if (!file.type.startsWith("image/")) return json({ ok: false, error: "not_image", name });
  if (file.size > MAX_UPLOAD_BYTES) return json({ ok: false, error: "too_large", name });
  return json(await putUpload(Buffer.from(await file.arrayBuffer()), name));
});
