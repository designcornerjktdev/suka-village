import type { Metadata } from "next";
import Image from "next/image";
import { notFound } from "next/navigation";
import { ArrowUpRight } from "lucide-react";
import { brand, photos, social, waHref } from "@/content/site";
import { getDict } from "@/content/dict";
import { isLocale } from "@/content/i18n";
import { pageMetadata } from "@/lib/seo";
import { getSection } from "@/lib/server/content";

export async function generateMetadata({ params }: PageProps<"/[lang]">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "id";
  const t = getDict(locale);
  return pageMetadata({ locale, title: t.seo.home.title, description: t.seo.home.description, image: "home", absoluteTitle: true });
}

/**
 * Home: one screen and nothing to scroll.
 *
 * The white header, then one photograph of the Main Villa filling the rest of
 * the screen edge to edge, with a thin line at its foot: the place and the
 * two ways to reach the owner. No slideshow and no caption, as the owner
 * asked. It fades in on load and then holds still.
 *
 * No title on the picture. The heading is there for screen readers and search
 * engines only.
 */
/* The site's own photograph until the CMS has one (Admin → Konten → Beranda). */
const DEFAULT_HERO = photos.mainVilla[11];

export default async function Home({ params }: PageProps<"/[lang]">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  const HERO = (await getSection("home"))[0]?.photos[0] ?? DEFAULT_HERO;

  return (
    <section className="sv-home">
      <h1 className="sr-only">
        {brand.name}, {t.hero.place}
      </h1>

      <div className="sv-home-stage">
        <Image
          src={HERO.src}
          alt={HERO.alt[lang]}
          fill
          loading="eager"
          fetchPriority="high"
          sizes="100vw"
          className="sv-photo sv-home-photo"
        />
      </div>

      <footer className="sv-home-foot">
        <div className="sv-home-meta">
          <p className="sv-home-place">
            © {new Date().getFullYear()} {brand.name} · {t.hero.place}
          </p>
          <nav aria-label={t.footer.reach}>
            <a href={waHref(t.common.waHello)} target="_blank" rel="noopener noreferrer">
              WhatsApp <ArrowUpRight size={13} strokeWidth={1.6} aria-hidden="true" />
            </a>
            <a href={social.instagram} target="_blank" rel="noopener noreferrer">
              Instagram <ArrowUpRight size={13} strokeWidth={1.6} aria-hidden="true" />
            </a>
          </nav>
        </div>
      </footer>
    </section>
  );
}
