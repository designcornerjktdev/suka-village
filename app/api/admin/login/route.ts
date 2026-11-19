import { z } from "zod";
import { login, SESSION_DAYS, sessionCookie } from "@/lib/server/auth";
import { clientIp, json, parseBody, tooMany } from "@/lib/server/http";
import { LIMITS, rateLimit } from "@/lib/server/ratelimit";

/* `login` is an email or a username; `email` is still accepted from older clients. */
const body = z.object({ login: z.string().max(200).optional(), email: z.string().max(200).optional(), password: z.string().max(200) });

/** POST /api/admin/login {login, password}: sets the session cookie (adminLogin). */
export async function POST(req: Request) {
  if (!(await rateLimit(`login:${clientIp(req)}`, LIMITS.login))) return tooMany();
  const input = await parseBody(req, body);
  const r = input ? await login(input.login ?? input.email ?? "", input.password) : null;
  if (!r) return json({ ok: false, error: "credentials" }, 401);
  const res = json({ ok: true, email: r.email });
  res.headers.append("set-cookie", sessionCookie(r.token, SESSION_DAYS * 24 * 3600));
  return res;
}
