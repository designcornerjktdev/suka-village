"use client";

import Image from "next/image";
import { useRef, useState } from "react";
import dynamic from "next/dynamic";
import { gallery } from "@/content/site";
import { fill, getDict } from "@/content/dict";
import type { Locale } from "@/content/i18n";

/* The full screen view loads when a photograph is first opened (or a moment
   before, when a thumbnail is pressed or focused). */
const loadViewer = () => import("./PhotoViewer");
const PhotoViewer = dynamic(loadViewer, { ssr: false });

/**
 * The gallery: a tight grid, and a tap opens a photograph full screen in the
 * same viewer a room's photographs use (PhotoViewer): white, swiped through
 * on a phone, enlarged with a tap or a pinch, arrows and Escape on a
 * keyboard. Closing it puts focus back on the photograph last seen.
 *
 * Every frame is the property's own, from the owner's Drive folders. Photos
 * only, no captions, as the owner asked (21 October 2026): what each picture
 * shows is still in its alt text for screen readers.
 */
export default function GalleryGrid({ locale }: { locale: Locale }) {
  const t = getDict(locale);
  const [open, setOpen] = useState<number | null>(null);
  const grid = useRef<HTMLUListElement>(null);
  const warm = () => void loadViewer();

  return (
    <>
      <ul ref={grid} className="sv-gallery">
        {gallery.map((photo, i) => (
          <li key={photo.src} className="sv-gallery-item">
            <button
              type="button"
              onClick={() => setOpen(i)}
              onPointerDown={warm}
              onFocus={warm}
              className="sv-gallery-btn"
              aria-label={fill(t.common.openPhoto, { n: i + 1 })}
            >
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

      {open !== null ? (
        <PhotoViewer
          photos={gallery}
          locale={locale}
          label={t.nav.gallery}
          start={open}
          onClose={(at) => {
            setOpen(null);
            grid.current?.children[at]?.querySelector("button")?.focus({ preventScroll: true });
          }}
        />
      ) : null}
    </>
  );
}
