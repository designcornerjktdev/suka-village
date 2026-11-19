import { z } from "zod";
import { withAdmin } from "@/lib/server/admin-route";
import { answerAdminError } from "@/lib/server/admin-users";
import { createAdmin, listAdmins } from "@/lib/server/admins";
import { db } from "@/lib/server/db";
import { json, parseBody } from "@/lib/server/http";

const body = z.object({ email: z.string().max(200), username: z.string().max(64), displayName: z.string().max(200), password: z.string().max(200) });

/** GET /api/admin/users: every admin account, oldest first, never a password hash. */
export const GET = withAdmin(async () => json({ ok: true, admins: await listAdmins(db) }));

/** POST /api/admin/users {email, username, displayName, password}: a new admin. */
export const POST = withAdmin(async (req) => {
  const input = await parseBody(req, body);
  if (!input) return json({ ok: false, error: "bad_request" }, 400);
  const r = await createAdmin(db, input);
  return r.ok ? json(r) : answerAdminError(r.error);
});
