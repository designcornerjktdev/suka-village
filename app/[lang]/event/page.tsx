import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import Showcase from "@/components/Showcase";
import { waHref } from "@/content/site";
import { getDict } from "@/content/dict";
import { isLocale, localePath, locales, type Locale } from "@/content/i18n";
import JsonLd from "@/components/JsonLd";
import PageNav from "@/components/PageNav";
import { breadcrumbs, pageMetadata } from "@/lib/seo";
import { getSection, paragraphs } from "@/lib/server/content";

/**
 * Event (ref: greenhosthotel.com): corporate and family gatherings, with the
 * owner's copy. An event is arranged in conversation, so the action here is a
 * question on WhatsApp with the event already named, not a booking form.
 * Events, order and "Segera hadir" come from Admin → Konten → Acara.
 */

/* The WhatsApp message: the written one for the two launch events, and the
   same sentence with the event's name for one added in the CMS. */
function askMessage(locale: Locale, id: string, name: string) {
  const written = (getDict(locale).event.message as Record<string, string | undefined>)[id];
  if (written) return written;
  return locale === "id" ? `Halo Suka Village, saya ingin bertanya tentang ${name}.` : `Hello Suka Village, I would like to ask about ${name}.`;
}

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/event">): Promise<Metadata> {
  const { lang } = await params;
  const locale = isLocale(lang) ? lang : "id";
  const t = getDict(locale);
  return pageMetadata({ locale, path: "event", ...t.seo.event, image: "event" });
}

export default async function EventPage({ params }: PageProps<"/[lang]/event">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);
  const items = await getSection("events");

  return (
    <>
      <section className="sv-page">
        <h1 className="sr-only">{t.seo.event.title}</h1>
        <PageNav title={t.nav.event} label={t.common.onThisPage} items={items.map((e) => ({ id: e.id, label: e.name[lang] }))} />
        <div className="sv-wrap">

          <div className="sv-rows">
            {items.map((e, i) => (
              <Showcase
                key={e.id}
                id={e.id}
                index={i}
                locale={lang}
                name={e.name[lang]}
                photos={e.photos}
                soon={e.soon ? t.common.soon : undefined}
                actions={
                  <>
                    <a href={waHref(askMessage(lang, e.id, e.name[lang]))} target="_blank" rel="noopener noreferrer" className="sv-btn sv-btn--primary sv-btn--sm">
                      <span>{t.event.ask}</span>
                      <ArrowUpRight size={16} strokeWidth={1.6} aria-hidden="true" />
                    </a>
                    {e.id === "corporate" ? (
                      <Link href={`${localePath(lang, "facilities")}#meeting`} className="sv-textlink">
                        {t.facilities.names.meeting}
                        <ArrowRight size={16} strokeWidth={1.5} aria-hidden="true" />
                      </Link>
                    ) : null}
                  </>
                }
              >
                <div className="sv-row-copy">
                  {paragraphs(e.body[lang]).map((para) => (
                    <p key={para}>{para}</p>
                  ))}
                </div>
              </Showcase>
            ))}
          </div>
        </div>
      </section>
      <JsonLd data={breadcrumbs(lang, [{ name: t.nav.event, path: "event" }])} />
    </>
  );
}
