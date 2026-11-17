import type { z } from "zod";

/** JSON response. */
export const json = (data: unknown, status = 200) => Response.json(data, { status });

export const tooMany = () => json({ ok: false, error: "rate_limited" }, 429);

/** One body for every "no such thing / not yours", so a guess learns nothing. */
export const notFound = () => json({ ok: false, error: "not_found" }, 404);

/** The visitor's address, as the host's proxy reports it. */
export function clientIp(req: Request): string {
  return req.headers.get("x-forwarded-for")?.split(",")[0].trim() || req.headers.get("x-real-ip") || "local";
}

/** Parses a JSON body with a zod schema; null when it does not fit. */
export async function parseBody<T extends z.ZodType>(req: Request, schema: T): Promise<z.infer<T> | null> {
  try {
    const r = schema.safeParse(await req.json());
    return r.success ? r.data : null;
  } catch {
    return null;
  }
}

/** The ?t= access token. */
export const tokenOf = (req: Request) => new URL(req.url).searchParams.get("t");
