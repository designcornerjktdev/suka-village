"use client";

import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { gallery } from "@/content/site";
import { lockScroll, unlockScroll } from "./scroll";
import { getDict } from "@/content/dict";
import type { Locale } from "@/content/i18n";

/**
 * The gallery, and the only lightbox on the site.
 *
 * Opening a photograph full screen is the one place a modal earns itself: the
 * task is looking at one image, and everything else on the page is in the way.
 * It closes on Escape, on the backdrop, and on the close control, and arrow
 * keys move through the set, so the keyboard can do everything the pointer can.
 *
 * Every frame is the property's own, from the owner's Drive folders. Photos
 * only, no captions, as the owner asked (21 October 2026): what each picture
 * shows is still in its alt text for screen readers.
 */
export default function GalleryGrid({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const [open, setOpen] = useState<number | null>(null);

  const move = useCallback(
    (delta: number) =>
      setOpen((current) =>
        current === null
          ? null
          : (current + delta + gallery.length) % gallery.length,
      ),
    [],
  );

  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(null);
      if (e.key === "ArrowRight") move(1);
      if (e.key === "ArrowLeft") move(-1);
    };
    document.addEventListener("keydown", onKey);
    lockScroll();
    return () => {
      document.removeEventListener("keydown", onKey);
      unlockScroll();
    };
  }, [open, move]);

  const current = open === null ? null : gallery[open];

  return (
    <>
      <ul className="sv-gallery">
        {gallery.map((photo, i) => (
          <li key={photo.src} className="sv-gallery-item">
            <button type="button" onClick={() => setOpen(i)} className="sv-gallery-btn">
              <span className="sv-gallery-frame">
                <Image
                  src={photo.src}
                  alt={photo.alt[locale]}
                  fill
                  sizes="(min-width: 900px) 25vw, (min-width: 600px) 34vw, 50vw"
                  loading={i < 4 ? "eager" : "lazy"}
                  fetchPriority={i === 0 ? "high" : "auto"}
                  className="sv-photo"
                />
              </span>
            </button>
          </li>
        ))}
      </ul>

      {current ? (
        <div className="sv-lightbox" role="dialog" aria-modal="true" aria-label={current.alt[locale]}>
          <button
            type="button"
            className="sv-lightbox-backdrop"
            aria-label={t.common.close}
            onClick={() => setOpen(null)}
          />

          <figure className="sv-lightbox-figure">
            <Image
              src={current.src}
              alt={current.alt[locale]}
              width={1600}
              height={1000}
              className="sv-lightbox-img"
            />
            <figcaption className="sv-lightbox-cap tnum" aria-hidden="true">
              {open! + 1} / {gallery.length}
            </figcaption>
          </figure>

          <button type="button" className="sv-lightbox-close" onClick={() => setOpen(null)}>
            <X size={20} strokeWidth={1.5} aria-hidden="true" />
            <span className="sr-only">{t.common.close}</span>
          </button>
          <button type="button" className="sv-lightbox-nav sv-lightbox-prev" onClick={() => move(-1)}>
            <ChevronLeft size={22} strokeWidth={1.5} aria-hidden="true" />
            <span className="sr-only">{t.common.prevPhoto}</span>
          </button>
          <button type="button" className="sv-lightbox-nav sv-lightbox-next" onClick={() => move(1)}>
            <ChevronRight size={22} strokeWidth={1.5} aria-hidden="true" />
            <span className="sr-only">{t.common.nextPhoto}</span>
          </button>
        </div>
      ) : null}
    </>
  );
}
