import type { Metadata, Viewport } from "next";
import { notFound } from "next/navigation";
import SiteHeader from "@/components/SiteHeader";
import SiteFooter from "@/components/SiteFooter";
import NotOnHome from "@/components/NotOnHome";
import JsonLd from "@/components/JsonLd";
import { brand } from "@/content/site";
import { getDict } from "@/content/dict";
import { isLocale, locales, type Locale } from "@/content/i18n";
import { siteGraph, sitePreview, siteRobots } from "@/lib/seo";
import { SITE_URL } from "@/lib/site-url";
import { fontVars } from "../fonts";
import "../globals.css";

/**
 * The root layout lives under [lang] on purpose.
 *
 * Next's own internationalization guide for this version puts every special
 * file under app/[lang] and allows the root layout to nest there, which is what
 * lets <html lang> carry the real locale instead of a hardcoded one. A page
 * served in English under lang="id" is wrong for screen readers, for
 * hyphenation and for translation tooling.
 */

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: LayoutProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "id";
  const t = getDict(locale);

  /* What every page under [lang] shares. Canonical and hreflang links are not
     here: each page sets its own (lib/seo.ts), because one set at the layout
     would point every inner page at the home page. */
  return {
    metadataBase: new URL(SITE_URL),
    applicationName: brand.name,
    title: {
      default: t.seo.home.title,
      template: `%s · ${brand.name}`,
    },
    description: t.seo.home.description,
    ...sitePreview(locale),
    robots: siteRobots,
    /* Search Console's HTML tag method: paste the token into the
       GOOGLE_SITE_VERIFICATION environment variable (docs/SEO.md). */
    verification: process.env.GOOGLE_SITE_VERIFICATION ? { google: process.env.GOOGLE_SITE_VERIFICATION } : undefined,
  };
}

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default async function LangLayout({ children, params }: LayoutProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const locale: Locale = lang;

  return (
    <html
      lang={locale}
      className={`${fontVars} antialiased`}
    >
      <body>
        <a href="#main" className="sv-skip">
          {getDict(locale).common.skip}
        </a>
        <SiteHeader locale={locale} />
        <main id="main">{children}</main>
        <NotOnHome locale={locale}>
          <SiteFooter locale={locale} />
        </NotOnHome>

        <JsonLd data={siteGraph(locale)} />
      </body>
    </html>
  );
}
