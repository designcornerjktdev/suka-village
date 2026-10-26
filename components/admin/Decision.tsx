"use client";

import { useState } from "react";
import { Check, LoaderCircle, X } from "lucide-react";
import { Dialog, toast } from "./ui";
import { confirmBooking, rejectBooking } from "@/lib/booking/api";
import { idr } from "@/lib/booking/format";
import type { Booking } from "@/lib/booking/types";

/**
 * The admin's decision on a paid booking: Terima or Tolak.
 *
 * Accepting is one tap, because it is the common case and it can be undone by
 * cancelling. Rejecting opens a dialog first: it asks for the reason the
 * guest will read, and it says plainly that the guest has already paid and
 * the money has to go back, which is the part that is easy to forget.
 *
 * Used in the booking list (so a morning's bookings can be cleared without
 * opening each one) and at the top of a booking's own page.
 */

const REASONS = [
  "Tanggal tidak tersedia.",
  "Kamar sedang diperbaiki pada tanggal tersebut.",
  "Jumlah tamu melebihi kapasitas kamar.",
];

export default function Decision({ booking, compact = false }: { booking: Booking; compact?: boolean }) {
  const [busy, setBusy] = useState<null | "accept" | "reject">(null);
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState(REASONS[0]);

  if (booking.status !== "paid") return null;

  const accept = async () => {
    setBusy("accept");
    await confirmBooking(booking.code);
    setBusy(null);
    toast(`${booking.code} diterima. Email konfirmasi terkirim.`);
  };

  const reject = async () => {
    setBusy("reject");
    await rejectBooking(booking.code, reason);
    setBusy(null);
    setOpen(false);
    toast(`${booking.code} ditolak. Jangan lupa proses refund.`);
  };

  return (
    <>
      <span className="ad-decide" data-compact={compact ? "true" : undefined}>
        <button type="button" className="ad-btn ad-btn--primary ad-btn--sm" onClick={accept} disabled={!!busy}>
          {busy === "accept" ? <LoaderCircle className="sv-spin" size={14} strokeWidth={1.8} aria-hidden="true" /> : <Check size={14} strokeWidth={2} aria-hidden="true" />}
          Terima
        </button>
        <button type="button" className="ad-btn ad-btn--danger ad-btn--sm" onClick={() => setOpen(true)} disabled={!!busy}>
          <X size={14} strokeWidth={2} aria-hidden="true" />
          Tolak
        </button>
      </span>

      <Dialog
        open={open}
        onClose={() => setOpen(false)}
        title={`Tolak ${booking.code}?`}
        footer={
          <>
            <button type="button" className="ad-btn ad-btn--ghost" onClick={() => setOpen(false)}>
              Tidak jadi
            </button>
            <button type="button" className="ad-btn ad-btn--danger" onClick={reject} disabled={!!busy || !reason.trim()}>
              {busy === "reject" ? <LoaderCircle className="sv-spin" size={14} strokeWidth={1.8} aria-hidden="true" /> : null}
              Tolak pesanan
            </button>
          </>
        }
      >
        <p className="ad-note ad-note--warn">
          <span>
            {booking.guest.name} sudah membayar <strong className="tnum">{idr(booking.payment.amount)}</strong>. Kalau ditolak, uangnya
            harus dikembalikan. Refund diproses manual, di luar sistem ini.
          </span>
        </p>
        <fieldset className="ad-fieldset">
          <legend>Alasan (dikirim ke tamu lewat email)</legend>
          <div className="ad-reasons">
            {REASONS.map((r) => (
              <label key={r} className="ad-check">
                <input type="radio" name={`reason-${booking.code}`} checked={reason === r} onChange={() => setReason(r)} />
                {r}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="sv-input">
          <label htmlFor={`reason-${booking.code}`}>Atau tulis sendiri</label>
          <textarea id={`reason-${booking.code}`} rows={2} value={reason} onChange={(e) => setReason(e.target.value)} />
        </div>
        <p className="ad-hint">Kamar langsung dilepas dan bisa dipesan tamu lain.</p>
      </Dialog>
    </>
  );
}
