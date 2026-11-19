import { z } from "zod";
import { withAdmin } from "@/lib/server/admin-route";
import { answerAdminError } from "@/lib/server/admin-users";
import { deleteAdmin, updateAdmin } from "@/lib/server/admins";
import { db } from "@/lib/server/db";
import { json, parseBody } from "@/lib/server/http";

type P = { id: string };
const body = z.object({ email: z.string().max(200), username: z.string().max(64), displayName: z.string().max(200) });

/** PATCH /api/admin/users/:id {email, username, displayName}. */
export const PATCH = withAdmin<P>(async (req, _admin, { id }) => {
  const input = await parseBody(req, body);
  if (!input) return json({ ok: false, error: "bad_request" }, 400);
  const r = await updateAdmin(db, id, input);
  return r.ok ? json(r) : answerAdminError(r.error);
});

/** DELETE /api/admin/users/:id: never one's own account. */
export const DELETE = withAdmin<P>(async (_req, admin, { id }) => {
  const r = await deleteAdmin(db, id, admin.adminId);
  return r.ok ? json(r) : answerAdminError(r.error);
});
