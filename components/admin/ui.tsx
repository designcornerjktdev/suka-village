"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowLeft, Check, LoaderCircle, Pencil, Trash2, X } from "lucide-react";
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

/**
 * A native <dialog>: focus trap, Escape and the backdrop come from the browser.
 *
 * `sheet` makes it a panel along the right edge (the whole screen on a
 * phone): the one place every record in the admin is added or edited, with
 * its Simpan at the bottom, so a list stays a list and a form stays a form.
 */
export function Dialog({
  open,
  onClose,
  title,
  lead,
  children,
  footer,
  wide,
  sheet,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  lead?: ReactNode;
  children: ReactNode;
  footer?: ReactNode;
  wide?: boolean;
  sheet?: boolean;
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
      data-sheet={sheet ? "true" : undefined}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      aria-label={title}
    >
      <div className="ad-dialog-inner">
        <div className="ad-dialog-head">
          <div>
            <h2>{title}</h2>
            {lead ? <p className="ad-dialog-lead">{lead}</p> : null}
          </div>
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

/** The editing panel. Same as Dialog with `sheet`. */
export function Sheet(props: Omit<Parameters<typeof Dialog>[0], "sheet" | "wide">) {
  return <Dialog {...props} sheet />;
}

/**
 * "Hapus X?": one confirmation for every delete in the admin, saying what
 * goes and what stays, with the destructive button last and busy while the
 * request runs.
 */
export function ConfirmDelete({
  open,
  title,
  children,
  confirmLabel = "Hapus",
  onCancel,
  onConfirm,
}: {
  open: boolean;
  title: string;
  children: ReactNode;
  confirmLabel?: string;
  onCancel: () => void;
  onConfirm: () => Promise<unknown> | void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Dialog
      open={open}
      onClose={onCancel}
      title={title}
      footer={
        <>
          <button type="button" className="ad-btn ad-btn--ghost" onClick={onCancel} disabled={busy}>
            Batal
          </button>
          <button
            type="button"
            className="ad-btn ad-btn--danger-solid"
            disabled={busy}
            onClick={async () => {
              setBusy(true);
              await onConfirm();
              setBusy(false);
            }}
          >
            {busy ? <LoaderCircle className="sv-spin" size={15} strokeWidth={1.8} aria-hidden="true" /> : <Trash2 size={15} strokeWidth={1.7} aria-hidden="true" />}
            {confirmLabel}
          </button>
        </>
      }
    >
      <div className="ad-muted">{children}</div>
    </Dialog>
  );
}

/** Ubah and Hapus at the end of a row, the same everywhere. */
export function RowActions({ label, onEdit, onDelete, deleteLabel = "Hapus", children }: { label: string; onEdit?: () => void; onDelete?: () => void; deleteLabel?: string; children?: ReactNode }) {
  return (
    <div className="ad-row-actions">
      {children}
      {onEdit ? (
        <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={onEdit} aria-label={`Ubah ${label}`}>
          <Pencil size={14} strokeWidth={1.7} aria-hidden="true" />
          <span>Ubah</span>
        </button>
      ) : null}
      {onDelete ? (
        <button type="button" className="ad-icon-btn ad-icon-btn--danger" onClick={onDelete} aria-label={`${deleteLabel} ${label}`} title={deleteLabel}>
          <Trash2 size={16} strokeWidth={1.6} aria-hidden="true" />
        </button>
      ) : null}
    </div>
  );
}

/** A form's footer inside a Sheet: Batal, then the primary action. */
export function SheetFooter({ busy, onCancel, onSave, saveLabel = "Simpan", disabled }: { busy?: boolean; onCancel: () => void; onSave: () => void; saveLabel?: string; disabled?: boolean }) {
  return (
    <>
      <button type="button" className="ad-btn ad-btn--ghost" onClick={onCancel} disabled={busy}>
        Batal
      </button>
      <button type="button" className="ad-btn ad-btn--primary" onClick={onSave} disabled={busy || disabled}>
        {busy ? <LoaderCircle className="sv-spin" size={15} strokeWidth={1.8} aria-hidden="true" /> : <Check size={15} strokeWidth={1.8} aria-hidden="true" />}
        {saveLabel}
      </button>
    </>
  );
}

/** A small status word in a coloured pill: aktif, tampil, disembunyikan. */
export function Badge({ tone = "neutral", children }: { tone?: "ok" | "warn" | "off" | "neutral"; children: ReactNode }) {
  return (
    <span className="ad-badge-pill" data-tone={tone}>
      {children}
    </span>
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

export function Empty({ children, action }: { children: ReactNode; action?: ReactNode }) {
  return (
    <div className="ad-empty">
      <p>{children}</p>
      {action}
    </div>
  );
}
