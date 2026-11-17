import { json } from "@/lib/server/http";
import { handleTokenRequest } from "@/lib/server/payments/notify";

/** POST /authorization/v1/access-token/b2b: DOKU asks for a token before notifying (SNAP standard path). */
export async function POST(req: Request) {
  const r = handleTokenRequest(req.headers);
  return json(r.body, r.status);
}
