import { z } from "zod";
import { login, SESSION_DAYS, sessionCookie } from "@/lib/server/auth";
import { clientIp, json, parseBody, tooMany } from "@/lib/server/http";
import { LIMITS, rateLimit } from "@/lib/server/ratelimit";

const body = z.object({ email: z.string().max(200), password: z.string().max(200) });

/** POST /api/admin/login {email, password}: sets the session cookie (adminLogin). */
export async function POST(req: Request) {
  if (!(await rateLimit(`login:${clientIp(req)}`, LIMITS.login))) return tooMany();
  const input = await parseBody(req, body);
  const r = input ? await login(input.email, input.password) : null;
  if (!r) return json({ ok: false, error: "credentials" }, 401);
  const res = json({ ok: true, email: r.email });
  res.headers.append("set-cookie", sessionCookie(r.token, SESSION_DAYS * 24 * 3600));
  return res;
}
