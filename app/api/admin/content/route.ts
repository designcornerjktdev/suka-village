import { withAdmin } from "@/lib/server/admin-route";
import { readContent } from "@/lib/server/catalog";
import { json } from "@/lib/server/http";

/** GET /api/admin/content (useContent in the CMS): every section, hidden items included. */
export const GET = withAdmin(async () => json(await readContent()));
