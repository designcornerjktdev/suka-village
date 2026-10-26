"use client";

import Link from "next/link";
import { useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import { ArrowLeft, Check, LoaderCircle, X } from "lucide-react";
import type { BookingStatus } from "@/lib/booking/types";

/**
 * The admin's small kit of parts. Same tokens as the site (paper, forest,
 * clay, Poppins), denser and plainer: this is a tool used daily on a phone
 * as often as on a laptop, so every control keeps a 44px target and every
 * state is said in words, not only in colour.
 */

export const STATUS_LABEL: Record<BookingStatus, string> = {
  pending: "Menunggu bayar",
  paid: "Perlu dikonfirmasi",
  confirmed: "Terkonfirmasi",
  rejected: "Ditolak",
  checked_in: "Sedang menginap",
  completed: "Selesai",
  cancelled: "Dibatalkan",
  expired: "Kedaluwarsa",
};

export function StatusPill({ status }: { status: BookingStatus }) {
  return (
    <span className="sv-pill" data-status={status}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function PageHeader({
  title,
  lead,
  actions,
  back,
}: {
  title: ReactNode;
  lead?: ReactNode;
  actions?: ReactNode;
  back?: { href: string; label: string };
}) {
  return (
    <header className="ad-head">
      {back ? (
        <Link href={back.href} className="ad-back">
          <ArrowLeft size={15} strokeWidth={1.6} aria-hidden="true" />
          {back.label}
        </Link>
      ) : null}
      <div className="ad-head-row">
        <div>
          <h1 className="ad-title">{title}</h1>
          {lead ? <p className="ad-lead">{lead}</p> : null}
        </div>
        {actions ? <div className="ad-head-actions">{actions}</div> : null}
      </div>
    </header>
  );
}

export function Card({
  title,
  actions,
  children,
  className = "",
  id,
}: {
  title?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  id?: string;
}) {
  return (
    <section className={`ad-card ${className}`} id={id}>
      {title || actions ? (
        <div className="ad-card-head">
          {title ? <h2 className="ad-card-title">{title}</h2> : <span />}
          {actions}
        </div>
      ) : null}
      {children}
    </section>
  );
}

export function Toggle({
  checked,
  onChange,
  label,
  hint,
  disabled,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  hint?: ReactNode;
  disabled?: boolean;
}) {
  return (
    <label className="ad-toggle" data-disabled={disabled ? "true" : undefined}>
      <span className="ad-toggle-text">
        <span>{label}</span>
        {hint ? <small>{hint}</small> : null}
      </span>
      <input type="checkbox" role="switch" checked={checked} disabled={disabled} onChange={(e) => onChange(e.target.checked)} className="sr-only" />
      <span className="ad-switch" aria-hidden="true" />
    </label>
  );
}

/** A native <dialog>: focus trap, Escape and the backdrop come from the browser. */
export function Dialog({
  open,
  onClose,
  title,
  children,
  footer,
  wide,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (open && !d.open) d.showModal();
    if (!open && d.open) d.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      className="ad-dialog"
      data-wide={wide ? "true" : undefined}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
    >
      <div className="ad-dialog-inner">
        <div className="ad-dialog-head">
          <h2>{title}</h2>
          <button type="button" className="ad-icon-btn" onClick={onClose}>
            <X size={18} strokeWidth={1.6} aria-hidden="true" />
            <span className="sr-only">Tutup</span>
          </button>
        </div>
        <div className="ad-dialog-body">{children}</div>
        {footer ? <div className="ad-dialog-foot">{footer}</div> : null}
      </div>
    </dialog>
  );
}

export function SaveBar({
  dirty,
  saving,
  saved,
  onSave,
  onReset,
}: {
  dirty: boolean;
  saving: boolean;
  saved: boolean;
  onSave: () => void;
  onReset: () => void;
}) {
  return (
    <div className="ad-savebar" data-dirty={dirty ? "true" : undefined}>
      <span className="ad-savebar-state" role="status">
        {saving ? "Menyimpan" : dirty ? "Ada perubahan yang belum disimpan" : saved ? "Tersimpan" : "Semua tersimpan"}
      </span>
      <div>
        <button type="button" className="ad-btn ad-btn--ghost" onClick={onReset} disabled={!dirty || saving}>
          Batalkan
        </button>
        <button type="button" className="ad-btn ad-btn--primary" onClick={onSave} disabled={!dirty || saving}>
          {saving ? <LoaderCircle className="sv-spin" size={15} strokeWidth={1.8} aria-hidden="true" /> : <Check size={15} strokeWidth={1.8} aria-hidden="true" />}
          Simpan
        </button>
      </div>
    </div>
  );
}

/* --- Toasts --------------------------------------------------------------- */

let toasts: { id: number; text: string }[] = [];
const toastListeners = new Set<() => void>();
let nextId = 1;

export function toast(text: string) {
  const id = nextId++;
  toasts = [...toasts, { id, text }];
  toastListeners.forEach((l) => l());
  window.setTimeout(() => {
    toasts = toasts.filter((t) => t.id !== id);
    toastListeners.forEach((l) => l());
  }, 3200);
}

const subscribeToasts = (l: () => void) => {
  toastListeners.add(l);
  return () => toastListeners.delete(l);
};
const EMPTY: typeof toasts = [];

export function Toaster() {
  const list = useSyncExternalStore(subscribeToasts, () => toasts, () => EMPTY);
  return (
    <div className="ad-toasts" role="status" aria-live="polite">
      {list.map((t) => (
        <p key={t.id} className="ad-toast">
          <Check size={15} strokeWidth={2} aria-hidden="true" />
          {t.text}
        </p>
      ))}
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="ad-empty">{children}</p>;
}
