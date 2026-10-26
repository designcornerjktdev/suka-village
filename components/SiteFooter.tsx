import Link from "next/link";
import { ArrowUpRight, MapPin } from "lucide-react";
import Logo from "./Logo";
import LangSwitch from "./LangSwitch";
import { brand, place, social, waHref } from "@/content/site";
import { getDict } from "@/content/dict";
import { localePath, type Locale } from "@/content/i18n";

/**
 * The footer, kept as small as it can be: one line with the logo, where the
 * estate is, the two places the owner answers (WhatsApp, Instagram) and the
 * language, then the copyright. Every page is already in the header, so it
 * does not list them again. The two landmark photographs on the Explore page
 * are credited beside them there, as their licences ask.
 */
export default function SiteFooter({ locale }: { locale: Locale }) {
  const t = getDict(locale);

  return (
    <footer className="sv-footer">
      <div className="sv-wrap sv-foot">
        <Link href={localePath(locale)} className="sv-foot-brand" aria-label={brand.name}>
          <Logo variant="full" className="sv-foot-logo" />
        </Link>

        <a href={place.mapHref} target="_blank" rel="noopener noreferrer" className="sv-foot-place">
          <MapPin size={15} strokeWidth={1.5} aria-hidden="true" />
          {t.hero.place}
        </a>

        <div className="sv-foot-links">
          <a href={waHref(t.common.waHello)} target="_blank" rel="noopener noreferrer">
            WhatsApp <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" />
          </a>
          <a href={social.instagram} target="_blank" rel="noopener noreferrer">
            Instagram <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" />
          </a>
          <LangSwitch locale={locale} />
        </div>
      </div>

      <div className="sv-wrap sv-foot-base">
        <p>
          © {new Date().getFullYear()} {brand.name}
        </p>
      </div>
    </footer>
  );
}
