import { NextResponse, type NextRequest } from "next/server";
import { defaultLocale, locales } from "@/content/i18n";

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
 */
export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  /* Everything except Next internals, the admin (Indonesian only, outside the
     locale tree), and anything with a file extension, so /photos/... and
     /favicon.ico are never rewritten into a locale. */
  matcher: ["/((?!_next|admin|.*\\..*).*)"],
};
