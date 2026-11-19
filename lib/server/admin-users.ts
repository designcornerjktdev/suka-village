import type { AdminError } from "./admins";
import { json } from "./http";

/** HTTP status for an account error: 409 taken, 404 unknown, 400 the rest. */
export const answerAdminError = (error: AdminError) => json({ ok: false, error }, error === "exists" ? 409 : error === "notFound" ? 404 : 400);
