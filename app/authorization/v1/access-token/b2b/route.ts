import { json } from "@/lib/server/http";
import { handleTokenRequest } from "@/lib/server/payments/notify";
import { traceDokuRequest } from "@/lib/server/payments/trace";

/** POST /authorization/v1/access-token/b2b: DOKU asks for a token before notifying (SNAP standard path). */
export async function POST(req: Request) {
  traceDokuRequest("token request in", req);
  const r = handleTokenRequest(req.headers);
  return json(r.body, r.status);
}
