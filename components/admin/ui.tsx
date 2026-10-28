"use client";

import Link from "next/link";
import { useCallback, useEffect, useId, useLayoutEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type ReactNode, type RefObject } from "react";
import { ArrowLeft, Check, ChevronsUpDown, Ellipsis, LoaderCircle, Pencil, Trash2, X } from "lucide-react";
import type { BookingStatus } from "@/lib/booking/types";

/**
 * The admin's small kit of parts. Same tokens as the site (paper, forest,
 * clay, Poppins), denser and plainer: this is a tool used daily on a phone
 * as often as on a laptop, so every control keeps a 44px target on touch
 * screens (40px with a mouse) and every state is said in words, not only in
 * colour. Icons are lucide at one size and stroke per role, set in CSS.
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

/* --- Popovers: Select and Menu -------------------------------------------- */

/**
 * Places a popover under (or, near the bottom of the screen, over) its
 * trigger with position: fixed, so no scrolling container clips it, and keeps
 * it there while anything scrolls. It stays in the DOM next to the trigger:
 * inside an open <dialog> everything outside is inert, so a portal to <body>
 * could not be clicked.
 */
function useAnchor(open: boolean, anchor: RefObject<HTMLElement | null>, pop: RefObject<HTMLElement | null>, align: "start" | "end", matchWidth: boolean) {
  useLayoutEffect(() => {
    if (!open) return;
    const place = () => {
      const a = anchor.current?.getBoundingClientRect();
      const p = pop.current;
      if (!a || !p) return;
      if (matchWidth) p.style.setProperty("min-width", `${a.width}px`);
      const h = p.offsetHeight;
      const w = p.offsetWidth;
      const room = window.innerHeight - a.bottom;
      const top = room < h + 12 && a.top > h + 12 ? a.top - h - 6 : a.bottom + 6;
      const left = Math.min(Math.max(8, align === "end" ? a.right - w : a.left), window.innerWidth - w - 8);
      p.style.setProperty("top", `${Math.round(top)}px`);
      p.style.setProperty("left", `${Math.round(left)}px`);
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, anchor, pop, align, matchWidth]);
}

/** Closes on a press anywhere outside the trigger and the popover. */
function useDismiss(open: boolean, close: () => void, refs: RefObject<HTMLElement | null>[]) {
  useEffect(() => {
    if (!open) return;
    const onDown = (e: PointerEvent) => {
      if (refs.some((r) => r.current?.contains(e.target as Node))) return;
      close();
    };
    document.addEventListener("pointerdown", onDown, true);
    return () => document.removeEventListener("pointerdown", onDown, true);
  }, [open, close, refs]);
}

/** Arrow keys, Home, End and first-letter jumps over a list of labels. */
function nextIndex(e: KeyboardEvent, current: number, labels: string[], disabled: boolean[] = []) {
  const n = labels.length;
  const step = (from: number, by: number) => {
    for (let i = 1; i <= n; i++) {
      const j = (from + by * i + n * n) % n;
      if (!disabled[j]) return j;
    }
    return from;
  };
  if (e.key === "ArrowDown") return step(current, 1);
  if (e.key === "ArrowUp") return step(current < 0 ? 0 : current, -1);
  if (e.key === "Home") return step(-1, 1);
  if (e.key === "End") return step(n, -1);
  if (e.key.length === 1 && /\S/.test(e.key)) {
    const k = e.key.toLowerCase();
    for (let i = 1; i <= n; i++) {
      const j = (current + i) % n;
      if (!disabled[j] && labels[j].toLowerCase().startsWith(k)) return j;
    }
  }
  return null;
}

export type SelectOption<T extends string = string> = { value: T; label: string; hint?: string };

/**
 * The admin's dropdown: a button showing the choice, and a list under it with
 * the current one ticked. Mouse, touch and keyboard (arrows, Home, End,
 * typing a first letter, Enter, Escape) behave as a native select does, but
 * it looks the same on every system and sits with the other controls.
 */
export function Select<T extends string>({
  id,
  value,
  onChange,
  options,
  ariaLabel,
  className = "",
  disabled,
}: {
  id?: string;
  value: T;
  onChange: (next: T) => void;
  options: SelectOption<T>[];
  ariaLabel?: string;
  className?: string;
  disabled?: boolean;
}) {
  const auto = useId();
  const base = id ?? auto;
  const button = useRef<HTMLButtonElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const current = options.find((o) => o.value === value);

  useAnchor(open, button, list, "start", true);
  const [refs] = useState(() => [button, list]);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, refs);

  const show = () => {
    setActive(Math.max(0, options.findIndex((o) => o.value === value)));
    setOpen(true);
  };
  useEffect(() => {
    if (open) list.current?.focus({ preventScroll: true });
  }, [open]);
  useEffect(() => {
    if (!open || active < 0) return;
    list.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const pick = (i: number) => {
    onChange(options[i].value);
    setOpen(false);
    button.current?.focus();
  };

  return (
    <div className={`ad-select-wrap ${className}`}>
      <button
        ref={button}
        id={base}
        type="button"
        className="ad-select"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? `${base}-list` : undefined}
        aria-label={ariaLabel}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={(e) => {
          if (["ArrowDown", "ArrowUp", "Enter", " "].includes(e.key)) {
            e.preventDefault();
            show();
          }
        }}
      >
        <span className="ad-select-value">{current?.label ?? "Pilih"}</span>
        <ChevronsUpDown aria-hidden="true" />
      </button>
      {open ? (
        <ul
          ref={list}
          id={`${base}-list`}
          role="listbox"
          tabIndex={-1}
          className="ad-pop"
          aria-labelledby={base}
          aria-activedescendant={active >= 0 ? `${base}-opt-${active}` : undefined}
          onKeyDown={(e) => {
            if (e.key === "Escape" || e.key === "Tab") {
              if (e.key === "Escape") e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              button.current?.focus();
              return;
            }
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              if (active >= 0) pick(active);
              return;
            }
            const n = nextIndex(e, active, options.map((o) => o.label));
            if (n !== null) {
              e.preventDefault();
              setActive(n);
            }
          }}
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${base}-opt-${i}`}
              role="option"
              data-index={i}
              aria-selected={o.value === value}
              data-active={i === active ? "true" : undefined}
              className="ad-pop-item"
              onPointerMove={() => setActive(i)}
              onClick={() => pick(i)}
            >
              <span className="ad-pop-text">
                {o.label}
                {o.hint ? <small>{o.hint}</small> : null}
              </span>
              {o.value === value ? <Check className="ad-pop-check" aria-hidden="true" /> : null}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export type MenuItem = { label: string; icon?: ReactNode; onSelect: () => void; danger?: boolean; disabled?: boolean } | "separator";

/** A "⋯" button that opens a short list of actions for one record. */
export function Menu({ label, items }: { label: string; items: MenuItem[] }) {
  const auto = useId();
  const button = useRef<HTMLButtonElement>(null);
  const menu = useRef<HTMLDivElement>(null);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const actions = items.filter((x): x is Exclude<MenuItem, "separator"> => x !== "separator");

  useAnchor(open, button, menu, "end", false);
  const [refs] = useState(() => [button, menu]);
  const close = useCallback(() => setOpen(false), []);
  useDismiss(open, close, refs);
  useEffect(() => {
    if (open) menu.current?.focus({ preventScroll: true });
  }, [open]);

  const run = (item: Exclude<MenuItem, "separator">) => {
    if (item.disabled) return;
    setOpen(false);
    button.current?.focus();
    item.onSelect();
  };

  /* Each item's place among the actions, separators skipped. */
  const at = items.map((item, i) => (item === "separator" ? -1 : items.slice(0, i + 1).filter((x) => x !== "separator").length - 1));
  return (
    <div className="ad-menu-wrap">
      <button
        ref={button}
        type="button"
        className="ad-icon-btn ad-icon-btn--quiet"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={open ? `${auto}-menu` : undefined}
        aria-label={`Tindakan untuk ${label}`}
        title="Tindakan"
        onClick={() => {
          setActive(-1);
          setOpen((o) => !o);
        }}
        onKeyDown={(e) => {
          if (e.key === "ArrowDown") {
            e.preventDefault();
            setActive(actions.findIndex((x) => !x.disabled));
            setOpen(true);
          }
        }}
      >
        <Ellipsis aria-hidden="true" />
      </button>
      {open ? (
        <div
          ref={menu}
          id={`${auto}-menu`}
          role="menu"
          tabIndex={-1}
          aria-label={`Tindakan untuk ${label}`}
          className="ad-pop ad-pop--menu"
          aria-activedescendant={active >= 0 ? `${auto}-item-${active}` : undefined}
          onKeyDown={(e) => {
            if (e.key === "Escape" || e.key === "Tab") {
              if (e.key === "Escape") e.preventDefault();
              e.stopPropagation();
              setOpen(false);
              button.current?.focus();
              return;
            }
            if ((e.key === "Enter" || e.key === " ") && active >= 0) {
              e.preventDefault();
              run(actions[active]);
              return;
            }
            const n = nextIndex(e, active, actions.map((x) => x.label), actions.map((x) => !!x.disabled));
            if (n !== null) {
              e.preventDefault();
              setActive(n);
            }
          }}
        >
          {items.map((item, i) => {
            if (item === "separator") return <div key={`sep-${i}`} role="separator" className="ad-pop-sep" />;
            return (
              <div
                key={item.label}
                id={`${auto}-item-${at[i]}`}
                role="menuitem"
                aria-disabled={item.disabled || undefined}
                data-active={at[i] === active ? "true" : undefined}
                data-danger={item.danger ? "true" : undefined}
                className="ad-pop-item"
                onPointerMove={() => setActive(at[i])}
                onClick={() => run(item)}
              >
                {item.icon}
                <span className="ad-pop-text">{item.label}</span>
              </div>
            );
          })}
        </div>
      ) : null}
    </div>
  );
}

/**
 * The actions at the end of a record's row, the same everywhere: the row
 * itself opens the record; this menu holds Ubah, anything particular to the
 * record, and Hapus last and in red.
 */
export function RowActions({
  label,
  onEdit,
  onDelete,
  deleteLabel = "Hapus",
  extra = [],
}: {
  label: string;
  onEdit?: () => void;
  onDelete?: () => void;
  deleteLabel?: string;
  extra?: MenuItem[];
}) {
  const items: MenuItem[] = [
    ...(onEdit ? [{ label: "Ubah", icon: <Pencil aria-hidden="true" />, onSelect: onEdit }] : []),
    ...extra,
    ...(onDelete ? (["separator", { label: deleteLabel, icon: <Trash2 aria-hidden="true" />, onSelect: onDelete, danger: true }] as MenuItem[]) : []),
  ];
  return (
    <div className="ad-row-actions">
      <Menu label={label} items={items} />
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
