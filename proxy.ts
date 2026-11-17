import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, locales } from "@/content/i18n";

/* Same name as lib/server/auth.ts ADMIN_COOKIE; not imported, so the proxy
   bundle stays free of the database client. */
const ADMIN_COOKIE = "sv_admin";

/**
 * Sends bare paths to a locale.
 *
 * `proxy` rather than `middleware`: the middleware file convention is
 * deprecated in this version of Next and renamed to proxy.
 *
 * The visitor's Accept-Language header decides, falling back to Indonesian,
 * which matches the owner's own material and the primary audience in
 * PRODUCT.md. Once redirected the locale lives in the URL, so the choice is
 * shareable and the language switch is a plain link.
 *
 * The admin (outside the locale tree) is only gated here: a request without a
 * session cookie goes to the login. Whether the session is valid is checked on
 * the server, in the (panel) layout and in every /api/admin handler, since
 * the proxy does not read the database.
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname === "/admin" || pathname.startsWith("/admin/")) {
    if (pathname === "/admin/login" || request.cookies.has(ADMIN_COOKIE)) return;
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.search = "";
    return NextResponse.redirect(url);
  }

  const hasLocale = locales.some(
    (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
  );
  if (hasLocale) return;

  const header = request.headers.get("accept-language") ?? "";
  const preferred = header
    .split(",")
    .map((part) => part.split(";")[0].trim().slice(0, 2).toLowerCase())
    .find((code) => (locales as readonly string[]).includes(code));

  const locale = preferred ?? defaultLocale;
  const url = request.nextUrl.clone();
  url.pathname = `/${locale}${pathname === "/" ? "" : pathname}`;
  return NextResponse.redirect(url);
}

export const config = {
  /* Everything except Next internals, the backend (/api, DOKU's token call at
     /authorization), uploaded photos, and anything with a file extension, so
     /photos/... and /favicon.ico are never rewritten into a locale. /admin is
     matched for the sign-in gate above, and never sent into a locale. */
  matcher: ["/((?!_next|api|authorization|uploads|.*\\..*).*)"],
};
