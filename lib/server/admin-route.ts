import { requireAdmin, type AdminUser } from "./auth";

type Ctx<P> = { params: Promise<P> };

/**
 * Wraps an /api/admin handler: no valid session, 401; otherwise the handler
 * gets the admin and the route params. Every admin route uses this, so none
 * can forget the check (tests/server/admin-api.test.ts loops over all of them).
 */
export function withAdmin<P = Record<string, never>>(handler: (req: Request, admin: AdminUser, params: P) => Promise<Response>) {
  return async (req: Request, ctx: Ctx<P>) => {
    const admin = await requireAdmin(req);
    if (admin instanceof Response) return admin;
    return handler(req, admin, await ctx.params);
  };
}
