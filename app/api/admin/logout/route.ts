import { logout, sessionCookie, tokenFromRequest } from "@/lib/server/auth";
import { json } from "@/lib/server/http";

/** POST /api/admin/logout: ends the session and clears the cookie (adminLogout). */
export async function POST(req: Request) {
  await logout(tokenFromRequest(req));
  const res = json({ ok: true });
  res.headers.append("set-cookie", sessionCookie("", 0));
  return res;
}
