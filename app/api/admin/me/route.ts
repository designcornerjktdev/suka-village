import { requireAdmin } from "@/lib/server/auth";
import { db } from "@/lib/server/db";
import { json } from "@/lib/server/http";

/** GET /api/admin/me: who is signed in (useAdminSession): id, email, username, display name. 401 when nobody is. */
export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;
  const row = await db.admin.findUnique({ where: { id: admin.adminId }, select: { username: true } });
  return json({ id: admin.adminId, email: admin.email, username: row?.username ?? null, displayName: admin.displayName });
}
