"use client";

import Image from "next/image";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Minus, Plus, X } from "lucide-react";
import type { Photo } from "@/content/site";
import { getDict } from "@/content/dict";
import type { Locale } from "@/content/i18n";
import { lockScroll, unlockScroll } from "./scroll";

/**
 * A room's photograph full screen, to look at closely: opened by a click or
 * tap on the photograph (`stage` in Slides).
 *
 * A native <dialog>, so focus stays inside it and Escape closes it, on the
 * same white as the page. The photograph first fits the screen; the + and −
 * buttons (or the + and − keys) step it up to 2.2 times and back, and a click
 * or tap on it goes straight to the closest view of the point clicked, or
 * back to the whole picture. Enlarged, it pans like any scrolled box: a
 * finger, a trackpad, a wheel, or a drag with the mouse. The arrows, the
 * arrow keys, and a swipe at normal size go through the rest of the room.
 * The photograph is asked for at the size it is shown, so an enlarged one
 * sharpens as the larger file arrives.
 */

const STEPS = [1, 1.6, 2.2];
const pad = (n: number) => String(n).padStart(2, "0");

type Drag = { x: number; y: number; left: number; top: number; moved: boolean; mouse: boolean };

export default function PhotoViewer({
  photos,
  locale,
  label,
  start,
  onClose,
}: {
  photos: readonly Photo[];
  locale: Locale;
  label: string;
  start: number;
  /** With the photograph the viewer was showing when it closed. */
  onClose: (at: number) => void;
}) {
  const t = getDict(locale).common;
  const dialog = useRef<HTMLDialogElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const drag = useRef<Drag | null>(null);
  /* The point to hold still while the zoom changes: where it was in the
     picture (as a fraction) and where it is on the screen. */
  const focus = useRef<{ fx: number; fy: number; x: number; y: number } | null>(null);

  const [at, setAt] = useState(start);
  const [step, setStep] = useState(0);
  const [box, setBox] = useState({ w: 0, h: 0 });
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);

  const count = photos.length;
  const many = count > 1;
  const photo = photos[at];
  const zoom = STEPS[step];

  /* The picture's size on screen: fitted to the box, times the zoom; and
     where it sits in the box while it is smaller than it. */
  const fit = natural && box.w ? Math.min(box.w / natural.w, box.h / natural.h) : 0;
  const w = natural ? natural.w * fit * zoom : 0;
  const h = natural ? natural.h * fit * zoom : 0;
  const ox = Math.max(0, (box.w - w) / 2);
  const oy = Math.max(0, (box.h - h) / 2);

  useEffect(() => {
    const d = dialog.current;
    if (d && !d.open) d.showModal();
    lockScroll();
    return unlockScroll;
  }, []);

  useEffect(() => {
    const el = stage.current;
    if (!el) return;
    const measure = new ResizeObserver(() => setBox({ w: el.clientWidth, h: el.clientHeight }));
    measure.observe(el);
    return () => measure.disconnect();
  }, []);

  useLayoutEffect(() => {
    const el = stage.current;
    const f = focus.current;
    if (!el || !f) return;
    focus.current = null;
    el.scrollLeft = f.fx * w + ox - f.x;
    el.scrollTop = f.fy * h + oy - f.y;
  }, [w, h, ox, oy]);

  const show = (i: number) => {
    setAt((i + count) % count);
    setStep(0);
    setNatural(null);
  };

  const zoomTo = (next: number, x = box.w / 2, y = box.h / 2) => {
    const el = stage.current;
    if (next === step) return;
    if (el && w) {
      const clamp = (n: number) => Math.min(1, Math.max(0, n));
      focus.current = { fx: clamp((el.scrollLeft + x - ox) / w), fy: clamp((el.scrollTop + y - oy) / h), x, y };
    }
    setStep(next);
  };

  return (
    <dialog
      ref={dialog}
      className="sv-viewer"
      aria-label={label}
      onClose={() => onClose(at)}
      onKeyDown={(e) => {
        if (e.key === "ArrowLeft" && many) show(at - 1);
        else if (e.key === "ArrowRight" && many) show(at + 1);
        else if (e.key === "+" || e.key === "=") zoomTo(Math.min(step + 1, STEPS.length - 1));
        else if (e.key === "-") zoomTo(Math.max(step - 1, 0));
        else return;
        e.preventDefault();
      }}
    >
      <div className="sv-viewer-bar">
        <p className="sv-viewer-count tnum" aria-hidden="true">
          <strong>{pad(at + 1)}</strong>
          <span>/ {pad(count)}</span>
        </p>
        <div className="sv-viewer-tools">
          <button type="button" className="sv-stage-btn" onClick={() => zoomTo(step - 1)} disabled={step === 0} aria-label={t.zoomOut}>
            <Minus size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <button
            type="button"
            className="sv-stage-btn"
            onClick={() => zoomTo(step + 1)}
            disabled={step === STEPS.length - 1}
            aria-label={t.zoomIn}
          >
            <Plus size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <button type="button" className="sv-stage-btn sv-viewer-close" onClick={() => dialog.current?.close()} aria-label={t.close}>
            <X size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      </div>

      <div
        ref={stage}
        className="sv-viewer-stage"
        data-zoomed={step > 0 ? "true" : undefined}
        onPointerDown={(e) => {
          if (e.button !== 0) return;
          const el = e.currentTarget;
          const mouse = e.pointerType === "mouse";
          drag.current = { x: e.clientX, y: e.clientY, left: el.scrollLeft, top: el.scrollTop, moved: false, mouse };
          if (mouse && step > 0) el.setPointerCapture(e.pointerId);
        }}
        onPointerMove={(e) => {
          const d = drag.current;
          if (!d) return;
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          if (Math.abs(dx) + Math.abs(dy) > 6) d.moved = true;
          if (d.mouse && step > 0) {
            e.currentTarget.scrollLeft = d.left - dx;
            e.currentTarget.scrollTop = d.top - dy;
          }
        }}
        onPointerUp={(e) => {
          const d = drag.current;
          drag.current = null;
          if (!d) return;
          const dx = e.clientX - d.x;
          const dy = e.clientY - d.y;
          if (!d.moved) {
            const r = e.currentTarget.getBoundingClientRect();
            zoomTo(step > 0 ? 0 : STEPS.length - 1, e.clientX - r.left, e.clientY - r.top);
          } else if (step === 0 && many && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy)) {
            show(at + (dx < 0 ? 1 : -1));
          }
        }}
        onPointerCancel={() => {
          drag.current = null;
        }}
      >
        <div className="sv-viewer-canvas" style={natural ? { width: Math.max(box.w, w), height: Math.max(box.h, h) } : undefined}>
          <div className="sv-viewer-frame" style={natural ? { width: w, height: h } : undefined}>
            <Image
              key={photo.src}
              src={photo.src}
              alt={photo.alt[locale]}
              fill
              sizes={`${Math.round(zoom * 100)}vw`}
              draggable={false}
              className="sv-viewer-photo"
              onLoad={(e) => setNatural({ w: e.currentTarget.naturalWidth, h: e.currentTarget.naturalHeight })}
            />
          </div>
        </div>
      </div>

      {many ? (
        <div className="sv-viewer-foot">
          <button type="button" className="sv-stage-btn" onClick={() => show(at - 1)} aria-label={t.prevPhoto}>
            <ArrowLeft size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>
          <button type="button" className="sv-stage-btn sv-stage-btn--next" onClick={() => show(at + 1)} aria-label={t.nextPhoto}>
            <ArrowRight size={20} strokeWidth={1.5} aria-hidden="true" />
          </button>
        </div>
      ) : null}
    </dialog>
  );
}
