import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Image from "next/image";
import { ArrowUpRight } from "lucide-react";
import JsonLd from "@/components/JsonLd";
import Showcase from "@/components/Showcase";
import { photos, place, social, waHref, whatsapp } from "@/content/site";
import { getDict } from "@/content/dict";
import { isLocale, locales } from "@/content/i18n";
import { formatPhone } from "@/lib/booking/format";
import { breadcrumbs, pageMetadata } from "@/lib/seo";

/**
 * Contact, in the same rows as every other page but unnumbered (two rows are
 * not a list): one for reaching the estate (WhatsApp, which the owner answers
 * for bookings and questions, and Instagram), one for finding it, with the
 * map where a photograph would be. No form: there is no inbox for one to land
 * in yet.
 *
 * The map is Google's embed, searched by the estate's plus code, so it needs
 * no API key. It loads lazily, only when the reader reaches it, and is set a
 * little high in its frame so the place card Google draws in its corner sits
 * out of view; the button beside it opens the full map.
 */

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/contact">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "id";
  const t = getDict(locale);
  return pageMetadata({ locale, path: "contact", ...t.seo.contact, image: "home" });
}

const MAP_QUERY = `${place.plusCode} Sukalarang, Sukabumi`;

export default async function ContactPage({ params }: PageProps<"/[lang]/contact">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  const c = t.contact;
  const welcome = photos.home[1];

  return (
    <>
      <section className="sv-page">
        <h1 className="sr-only">{t.seo.contact.title}</h1>
        <div className="sv-wrap">
          <div className="sv-rows">
            <Showcase
              index={0}
              numbered={false}
              locale={lang}
              name={c.reserveTitle}
              media={
                <Image
                  src={welcome.src}
                  alt={welcome.alt[lang]}
                  fill
                  loading="eager"
                  fetchPriority="high"
                  sizes="(min-width: 900px) 56vw, 100vw"
                  className="sv-photo"
                />
              }
              actions={
                <>
                  <a href={waHref(t.common.waHello)} target="_blank" rel="noopener noreferrer" className="sv-btn sv-btn--primary sv-btn--sm">
                    <span>{c.chat}</span>
                    <ArrowUpRight size={16} strokeWidth={1.6} aria-hidden="true" />
                  </a>
                  <a href={social.instagram} target="_blank" rel="noopener noreferrer" className="sv-textlink">
                    Instagram {social.handle}
                    <ArrowUpRight size={16} strokeWidth={1.5} aria-hidden="true" />
                  </a>
                </>
              }
            >
              <div className="sv-row-copy">
                <p>{c.reserveCopy}</p>
              </div>
              <a href={waHref(t.common.waHello)} target="_blank" rel="noopener noreferrer" className="sv-contact-number tnum">
                {formatPhone(`+${whatsapp.number}`)}
              </a>
            </Showcase>

            <Showcase
              index={1}
              numbered={false}
              locale={lang}
              name={c.location}
              media={
                <div className="sv-contact-map">
                  <iframe
                    title={c.mapTitle}
                    src={`https://maps.google.com/maps?q=${encodeURIComponent(MAP_QUERY)}&z=14&output=embed`}
                    loading="lazy"
                    referrerPolicy="no-referrer-when-downgrade"
                    allowFullScreen
                  />
                </div>
              }
              actions={
                <a href={place.mapHref} target="_blank" rel="noopener noreferrer" className="sv-btn sv-btn--primary sv-btn--sm">
                  <span>{c.route}</span>
                  <ArrowUpRight size={16} strokeWidth={1.6} aria-hidden="true" />
                </a>
              }
            >
              <div className="sv-row-copy">
                <p>{place.address}</p>
              </div>
              <p className="sv-contact-plus tnum">Plus code {place.plusCode}</p>
            </Showcase>
          </div>
        </div>
      </section>
      <JsonLd data={breadcrumbs(lang, [{ name: t.nav.contact, path: "contact" }])} />
    </>
  );
}
