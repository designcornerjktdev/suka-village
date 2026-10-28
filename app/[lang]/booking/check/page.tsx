import type { Metadata } from "next";
import { notFound } from "next/navigation";
import FindBooking from "@/components/booking/FindBooking";
import Emph from "@/components/Emph";
import { plain } from "@/components/tokens";
import { getDict } from "@/content/dict";
import { isLocale, locales } from "@/content/i18n";

export function generateStaticParams() {
  return locales.map((lang) => ({ lang }));
}

export async function generateMetadata({ params }: PageProps<"/[lang]/booking/check">): Promise<Metadata> {
  const { lang } = await params;
  const t = getDict(isLocale(lang) ? lang : "id");
  return { title: plain(t.order.checkTitle), robots: { index: false, follow: true } };
}

export default async function CheckPage({ params }: PageProps<"/[lang]/booking/check">) {
  const { lang } = await params;
  if (!isLocale(lang)) notFound();
  const t = getDict(lang);

  return (
    <section className="sv-page">
      {/* A tool, not a content page: unlike the others it opens with its
          title and one line on where the code is, so the form explains itself. */}
      <div className="sv-wrap sv-utility">
        <h1 className="sv-statement">
          <Emph text={t.order.checkTitle} />
        </h1>
        <p className="sv-lead">{t.order.checkLead}</p>
        <FindBooking locale={lang} />
      </div>
    </section>
  );
}
