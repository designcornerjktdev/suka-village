import type { Metadata } from "next";
import { notFound } from "next/navigation";
import OrderView from "@/components/booking/OrderView";
import { getDict } from "@/content/dict";
import { isLocale } from "@/content/i18n";

/**
 * One booking: payment instructions while it is pending, the confirmation
 * once paid. Every email and WhatsApp message links here.
 *
 * Private by nature, so it is never indexed. In production the URL carries a
 * signed token rather than the bare code (BOOKING.md, "Order page access").
 */

export async function generateMetadata({ params }: PageProps<"/[lang]/booking/[code]">): Promise<Metadata> {
  const { lang, code } = await params;
  const t = getDict(isLocale(lang) ? lang : "id");
  return { title: `${t.order.code} ${code.toUpperCase()}`, robots: { index: false, follow: false } };
}

export default async function OrderPage({ params }: PageProps<"/[lang]/booking/[code]">) {
  const { lang, code } = await params;
  if (!isLocale(lang)) notFound();

  return (
    <section className="sv-page">
      <div className="sv-wrap sv-order-wrap">
        <OrderView locale={lang} code={decodeURIComponent(code)} />
      </div>
    </section>
  );
}
