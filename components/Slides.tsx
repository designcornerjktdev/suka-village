"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import type { Photo } from "@/content/site";
import { fill, getDict } from "@/content/dict";
import type { Locale } from "@/content/i18n";

/**
 * A photo slider, as the brief's references draw it: chevrons on either side
 * of the picture, dots along its foot.
 *
 * Underneath it is a native scroller with CSS snap, the same as the room row.
 * Touch swipes, trackpads and arrow keys all move it with the platform's own
 * physics, and the controls only call scrollTo. The current slide is read back
 * from the scroll position, so the dots are right however the slider moved.
 *
 * The chevrons wrap from the last photo to the first. A single photograph gets
 * no controls at all rather than controls that do nothing.
 *
 * Only the first photograph loads with the page. The rest wait until the page
 * has finished loading, or until the slider is touched, hovered or focused,
 * whichever comes first: on a phone on a slow connection the photograph on
 * screen then has the bandwidth to itself, and the next ones are ready by the
 * time a thumb gets to them.
 */
export default function Slides({
  photos,
  locale,
  name,
  sizes,
  priority = false,
  className = "",
}: {
  photos: readonly Photo[];
  locale: Locale;
  name: string;
  sizes: string;
  priority?: boolean;
  className?: string;
}) {
  const t = getDict(locale).common;
  const track = useRef<HTMLDivElement>(null);
  const [index, setIndex] = useState(0);
  const [armed, setArmed] = useState(false);
  const count = photos.length;
  const many = count > 1;
  const arm = () => setArmed(true);

  useEffect(() => {
    if (!many || armed) return;
    let idle = 0;
    const later = () => {
      idle = window.setTimeout(() => setArmed(true), 400);
    };
    if (document.readyState === "complete") later();
    else window.addEventListener("load", later, { once: true });
    return () => {
      window.removeEventListener("load", later);
      window.clearTimeout(idle);
    };
  }, [many, armed]);

  useEffect(() => {
    const el = track.current;
    if (!el || !many) return;
    let frame = 0;
    const read = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const width = el.clientWidth || 1;
        setIndex(Math.min(count - 1, Math.max(0, Math.round(el.scrollLeft / width))));
      });
    };
    el.addEventListener("scroll", read, { passive: true });
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener("scroll", read);
    };
  }, [count, many]);

  const go = (to: number) => {
    const el = track.current;
    if (!el) return;
    arm();
    const next = (to + count) % count;
    const still = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    el.scrollTo({ left: next * el.clientWidth, behavior: still ? "auto" : "smooth" });
  };

  const label = fill(t.photosOf, { name });

  return (
    <div
      className={`sv-slides ${className}`}
      role="region"
      aria-roledescription="carousel"
      aria-label={label}
      onPointerEnter={many ? arm : undefined}
      onTouchStart={many ? arm : undefined}
      onFocus={many ? arm : undefined}
    >
      <div ref={track} className="sv-slides-track" tabIndex={many ? 0 : undefined} aria-label={many ? label : undefined}>
        {photos.map((photo, i) => (
          <div
            key={photo.src}
            className="sv-slide"
            role="group"
            aria-roledescription="slide"
            aria-label={`${i + 1} / ${count}`}
          >
            {i === 0 || armed ? (
              <Image
                src={photo.src}
                alt={photo.alt[locale]}
                fill
                sizes={sizes}
                loading={priority && i === 0 ? "eager" : "lazy"}
                fetchPriority={priority && i === 0 ? "high" : "auto"}
                className="sv-photo"
              />
            ) : null}
          </div>
        ))}
      </div>

      {many ? (
        <>
          <button type="button" className="sv-slides-arrow sv-slides-prev" onClick={() => go(index - 1)} aria-label={t.prevPhoto}>
            <ChevronLeft size={22} strokeWidth={1.6} aria-hidden="true" />
          </button>
          <button type="button" className="sv-slides-arrow sv-slides-next" onClick={() => go(index + 1)} aria-label={t.nextPhoto}>
            <ChevronRight size={22} strokeWidth={1.6} aria-hidden="true" />
          </button>

          <span className="sv-slides-count tnum" aria-hidden="true">
            {String(index + 1).padStart(2, "0")}
            <span> / {String(count).padStart(2, "0")}</span>
          </span>

          <div className="sv-slides-dots">
            {photos.map((photo, i) => (
              <button
                key={photo.src}
                type="button"
                onClick={() => go(i)}
                aria-label={fill(t.goToPhoto, { n: i + 1 })}
                aria-current={i === index ? "true" : undefined}
              >
                <span />
              </button>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
