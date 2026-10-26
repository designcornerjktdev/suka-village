"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { ArrowRight, ArrowUpRight, X } from "lucide-react";
import Logo from "./Logo";
import LangSwitch from "./LangSwitch";
import BookingBar from "./BookingBar";
import { lockScroll, unlockScroll } from "./scroll";
import { brand, social, waHref } from "@/content/site";
import { getDict } from "@/content/dict";
import { localePath, type Locale } from "@/content/i18n";

/**
 * Site header and the mobile menu.
 *
 * Slim and quiet: the mark on the left, the tabs centred, the language, the
 * dates and Book now on the right. Frosted white over the page, so what
 * scrolls beneath shows through softly; a hairline appears once the page
 * moves. On the home page it floats clear over the photograph, in white.
 * Colour changes ease; nothing in it slides or bounces.
 *
 * The mobile menu remembers the ROUTE it was opened on and is open only while
 * that is still the route. Navigating anywhere makes it closed by definition,
 * with no effect scheduled to close it. (An earlier effect that closed it "on
 * navigation" also ran on opening, and shut the menu one frame later.)
 */
export default function SiteHeader({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const pathname = usePathname() || "";
  const home = localePath(locale);
  const isHome = pathname === home || pathname === `${home}/`;

  const [scrolled, setScrolled] = useState(false);
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;

  const sentinel = useRef<HTMLDivElement>(null);
  const toggle = useRef<HTMLButtonElement>(null);
  const firstLink = useRef<HTMLAnchorElement>(null);

  /* An IntersectionObserver on a sentinel rather than a scroll listener. */
  useEffect(() => {
    const node = sentinel.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(([entry]) => setScrolled(!entry.isIntersecting));
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  /* While open: hold the page still, close on Escape, and put focus inside. */
  useEffect(() => {
    if (!open) return;
    lockScroll();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpenAt(null);
    document.addEventListener("keydown", onKey);
    const focusTimer = window.setTimeout(() => firstLink.current?.focus(), 60);
    const button = toggle.current;
    return () => {
      window.clearTimeout(focusTimer);
      document.removeEventListener("keydown", onKey);
      unlockScroll();
      button?.focus({ preventScroll: true });
    };
  }, [open]);

  /* The order the owner set: home, the stay, what is on the estate, what is
     around it, the pictures, then how to reach them. */
  const nav = [
    { href: home, label: t.nav.home },
    { href: localePath(locale, "rooms"), label: t.nav.rooms },
    { href: localePath(locale, "facilities"), label: t.nav.facilities },
    { href: localePath(locale, "experience"), label: t.nav.experience },
    { href: localePath(locale, "event"), label: t.nav.event },
    { href: localePath(locale, "explore"), label: t.nav.explore },
    { href: localePath(locale, "gallery"), label: t.nav.gallery },
    { href: localePath(locale, "contact"), label: t.nav.contact },
  ];

  const isCurrent = (href: string) =>
    href === home ? isHome : pathname === href || pathname.startsWith(`${href}/`);

  const close = () => setOpenAt(null);

  return (
    <>
      <div ref={sentinel} className="sv-sentinel" aria-hidden="true" />

      <header className="sv-header" data-scrolled={scrolled ? "true" : undefined}>
        <Link href={home} className="sv-brand" aria-label={brand.name}>
          <Logo variant="full" className="sv-brand-logo" />
        </Link>

        <nav className="sv-tabs" aria-label={t.common.menu}>
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              data-current={isCurrent(item.href) ? "true" : undefined}
              aria-current={isCurrent(item.href) ? "page" : undefined}
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="sv-header-end">
          <LangSwitch locale={locale} compact />
          <BookingBar locale={locale} />
          <button
            ref={toggle}
            type="button"
            className="sv-menu-btn"
            aria-expanded={open}
            aria-controls="sv-menu"
            onClick={() => setOpenAt(open ? null : pathname)}
          >
            <span className="sv-menu-bars" aria-hidden="true">
              <span />
              <span />
            </span>
            <span className="sr-only">{t.common.menu}</span>
          </button>
        </div>
      </header>

      {open ? (
        <div id="sv-menu" className="sv-menu" role="dialog" aria-modal="true" aria-label={t.common.menu}>
          {/* Its own header, so closing never depends on reaching a button
              the overlay has covered. */}
          <div className="sv-menu-top">
            <Link href={home} className="sv-brand" aria-label={brand.name} onClick={close}>
              <Logo variant="full" className="sv-brand-logo" />
            </Link>
            <button type="button" className="sv-menu-close" onClick={close}>
              <X size={22} strokeWidth={1.4} aria-hidden="true" />
              <span className="sr-only">{t.common.close}</span>
            </button>
          </div>

          <nav className="sv-menu-nav" aria-label={t.common.menu}>
            {nav.map((item, i) => (
              <Link
                key={item.href}
                ref={i === 0 ? firstLink : undefined}
                style={{ ["--i" as string]: i }}
                href={item.href}
                data-current={isCurrent(item.href) ? "true" : undefined}
                aria-current={isCurrent(item.href) ? "page" : undefined}
                onClick={close}
              >
                <span className="sv-menu-num tnum" aria-hidden="true">
                  {String(i + 1).padStart(2, "0")}
                </span>
                <span>{item.label}</span>
                <ArrowRight className="sv-menu-arrow" size={22} strokeWidth={1.3} aria-hidden="true" />
              </Link>
            ))}
          </nav>

          <div className="sv-menu-foot">
            <Link href={localePath(locale, "booking")} className="sv-btn sv-btn--primary" onClick={close}>
              <span>{t.common.bookNow}</span>
              <ArrowRight size={16} strokeWidth={1.6} aria-hidden="true" />
            </Link>
            <div className="sv-menu-meta">
              <a href={waHref(t.common.waHello)} target="_blank" rel="noopener noreferrer">
                WhatsApp <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" />
              </a>
              <a href={social.instagram} target="_blank" rel="noopener noreferrer">
                {social.handle} <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" />
              </a>
              <LangSwitch locale={locale} />
            </div>
          </div>
        </div>
      ) : null}
    </>
  );
}
