import { z } from "zod";
import { withAdmin } from "@/lib/server/admin-route";
import { answerAdminError } from "@/lib/server/admin-users";
import { resetPassword } from "@/lib/server/admins";
import { db } from "@/lib/server/db";
import { json, parseBody } from "@/lib/server/http";

type P = { id: string };
const body = z.object({ password: z.string().max(200) });

/**
 * PUT /api/admin/users/:id/password {password}: sets ANOTHER admin's password;
 * they are signed out everywhere. One's own goes through /api/admin/me/password,
 * which asks for the current one: a stolen session must not reset it.
 */
export const PUT = withAdmin<P>(async (req, admin, { id }) => {
  if (id === admin.adminId) return answerAdminError("self");
  const input = await parseBody(req, body);
  if (!input) return json({ ok: false, error: "bad_request" }, 400);
  const r = await resetPassword(db, id, input.password);
  return r.ok ? json(r) : answerAdminError(r.error);
});
