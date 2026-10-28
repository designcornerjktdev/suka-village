import type { Metadata } from "next";
import { notFound } from "next/navigation";
import GalleryGrid from "@/components/GalleryGrid";
import { getDict } from "@/content/dict";
import { isLocale, locales } from "@/content/i18n";
import JsonLd from "@/components/JsonLd";
import PageNav from "@/components/PageNav";
import { breadcrumbs, pageMetadata } from "@/lib/seo";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/gallery">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "id";
  const t = getDict(locale);
  return pageMetadata({ locale, path: "gallery", ...t.seo.gallery, image: "gallery" });
}

export default async function GalleryPage({ params }: PageProps<"/[lang]/gallery">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);

  return (
    <>
      <section className="sv-page">
        <h1 className="sr-only">{t.seo.gallery.title}</h1>
        <PageNav title={t.nav.gallery} label={t.common.onThisPage} items={[]} />
        <div className="sv-wrap">
          <GalleryGrid locale={lang} />
        </div>
      </section>
      <JsonLd data={breadcrumbs(lang, [{ name: t.nav.gallery, path: "gallery" }])} />
    </>
  );
}
