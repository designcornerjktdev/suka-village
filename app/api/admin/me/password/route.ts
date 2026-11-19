import { z } from "zod";
import { withAdmin } from "@/lib/server/admin-route";
import { answerAdminError } from "@/lib/server/admin-users";
import { changeOwnPassword } from "@/lib/server/admins";
import { db } from "@/lib/server/db";
import { json, parseBody } from "@/lib/server/http";

const body = z.object({ current: z.string().max(200), next: z.string().max(200) });

/** PUT /api/admin/me/password {current, next}: one's own password; other sessions end, this one stays. */
export const PUT = withAdmin(async (req, admin) => {
  const input = await parseBody(req, body);
  if (!input) return json({ ok: false, error: "bad_request" }, 400);
  const r = await changeOwnPassword(db, admin.adminId, input.current, input.next, admin.tokenHash);
  return r.ok ? json(r) : answerAdminError(r.error);
});
