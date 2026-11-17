import { requireAdmin } from "@/lib/server/auth";
import { json } from "@/lib/server/http";

/** GET /api/admin/me: who is signed in (useAdminSession). 401 when nobody is. */
export async function GET(req: Request) {
  const admin = await requireAdmin(req);
  if (admin instanceof Response) return admin;
  return json({ email: admin.email });
}
