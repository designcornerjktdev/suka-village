"use client";

import Link from "next/link";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Lock, Pencil, Trash2 } from "lucide-react";
import { Card, ConfirmDelete, Dialog, Empty, PageHeader, RowActions, Sheet, SheetFooter, toast } from "./ui";
import { useBlocks, useBookings, useRooms } from "@/lib/booking/hooks";
import { createBlock, deleteBlock, updateBlock } from "@/lib/booking/api";
import { addDays, day, fmtDate, iso, nightsOf, todayISO } from "@/lib/booking/format";
import { HOLDING, type Block, type BlockReason, type UnitId } from "@/lib/booking/types";

/**
 * The manual calendar: a row per room, a column per day, a bar per stay.
 * Website bookings link to their booking; dates closed by hand are hatched and
 * can be opened again.
 *
 * There is no automatic sync with Airbnb, Booking.com or any other platform,
 * by the owner's decision. When a room is sold somewhere else, or is being
 * repaired, or the owner is using it, someone closes those dates here, and the
 * website stops offering them. A free day can be clicked to close it directly.
 * Closed dates coming up are also listed under the calendar, each with Ubah
 * and Buka kembali.
 */

export const REASON_LABEL: Record<BlockReason, string> = {
  airbnb: "Airbnb",
  booking_com: "Booking.com",
  maintenance: "Perawatan",
  owner: "Dipakai pemilik",
  other: "Lainnya",
};

const MONTHS = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
const WEEK = ["M", "S", "S", "R", "K", "J", "S"];

type Prefill = { unit?: UnitId; from?: string; block?: Block; n: number };

export default function AdminCalendar() {
  const bookings = useBookings();
  const blocks = useBlocks();
  const rooms = useRooms();
  const today = todayISO();
  const [month, setMonth] = useState(() => today.slice(0, 8) + "01");
  const [prefill, setPrefill] = useState<Prefill | null>(null);
  const [selected, setSelected] = useState<Block | null>(null);
  const [reopening, setReopening] = useState<Block | null>(null);

  const first = day(month);
  const daysInMonth = new Date(first.getFullYear(), first.getMonth() + 1, 0).getDate();
  const days = Array.from({ length: daysInMonth }, (_, i) => addDays(month, i));
  const monthEnd = addDays(month, daysInMonth);
  const roomName = (unit: UnitId) => rooms.find((r) => r.unit === unit)?.name ?? unit;

  const shift = (n: number) => {
    const d = new Date(first.getFullYear(), first.getMonth() + n, 1);
    setMonth(iso(d));
  };

  /* Where a stay sits in this month's grid, clipped at the month's edges. */
  const clip = (from: string, to: string) => {
    const start = from < month ? month : from;
    const end = to > monthEnd ? monthEnd : to;
    if (end <= start) return null;
    return { col: nightsOf(month, start).length + 2, span: nightsOf(start, end).length, cutStart: from < month, cutEnd: to > monthEnd };
  };

  const rows = rooms.map((room) => ({
    room,
    bookings: bookings
      .filter((b) => b.units.includes(room.unit) && HOLDING.includes(b.status))
      .map((b) => ({ b, pos: clip(b.checkIn, b.checkOut) }))
      .filter((x) => x.pos),
    blocks: blocks
      .filter((k) => k.unit === room.unit)
      .map((k) => ({ k, pos: clip(k.from, k.to) }))
      .filter((x) => x.pos),
  }));

  const openDialog = (unit?: UnitId, from?: string, block?: Block) => setPrefill((p) => ({ unit, from, block, n: (p?.n ?? 0) + 1 }));
  const upcoming = blocks.filter((k) => k.to > today && rooms.some((r) => r.unit === k.unit)).sort((a, b) => a.from.localeCompare(b.from));

  return (
    <>
      <PageHeader
        title="Kalender"
        lead="Semua kamar dalam satu layar. Tanggal yang sudah terjual di Airbnb, Booking.com atau platform lain, atau kamar yang sedang diperbaiki: tutup di sini, dan tanggalnya tidak bisa dipesan lewat website. Klik tanggal kosong untuk langsung menutupnya."
        actions={
          <button type="button" className="ad-btn ad-btn--primary" onClick={() => openDialog()}>
            <Lock size={15} strokeWidth={1.7} aria-hidden="true" />
            Tutup tanggal
          </button>
        }
      />

      <Card>
        <div className="ad-cal-bar">
          <div className="ad-cal-nav">
            <button type="button" className="ad-icon-btn" onClick={() => shift(-1)} aria-label="Bulan sebelumnya">
              <ChevronLeft size={18} strokeWidth={1.6} aria-hidden="true" />
            </button>
            <p className="ad-cal-month">
              {MONTHS[first.getMonth()]} {first.getFullYear()}
            </p>
            <button type="button" className="ad-icon-btn" onClick={() => shift(1)} aria-label="Bulan berikutnya">
              <ChevronRight size={18} strokeWidth={1.6} aria-hidden="true" />
            </button>
          </div>
          <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setMonth(today.slice(0, 8) + "01")}>
            Bulan ini
          </button>
        </div>

        <div className="ad-cal-scroll">
          <div className="ad-cal" style={{ ["--days" as string]: daysInMonth }}>
            <div className="ad-cal-row ad-cal-head">
              <span className="ad-cal-label" />
              {days.map((d, i) => {
                const w = day(d).getDay();
                return (
                  <span key={d} className="ad-cal-day" style={{ gridColumn: i + 2 }} data-weekend={w === 0 || w === 6 ? "true" : undefined} data-today={d === today ? "true" : undefined}>
                    <small>{WEEK[w]}</small>
                    <span className="tnum">{day(d).getDate()}</span>
                  </span>
                );
              })}
            </div>

            {rows.map((row) => (
              <div key={row.room.unit} className="ad-cal-row">
                <span className="ad-cal-label">{row.room.name}</span>
                {days.map((d, i) => {
                  const w = day(d).getDay();
                  const weekend = w === 0 || w === 6 ? "true" : undefined;
                  return d < today ? (
                    <span key={d} className="ad-cal-cell" style={{ gridColumn: i + 2 }} data-weekend={weekend} data-past="true" aria-hidden="true" />
                  ) : (
                    <button
                      key={d}
                      type="button"
                      className="ad-cal-cell"
                      style={{ gridColumn: i + 2 }}
                      data-weekend={weekend}
                      onClick={() => openDialog(row.room.unit, d)}
                      aria-label={`Tutup ${row.room.name}, ${fmtDate(d, "id", "day")}`}
                    />
                  );
                })}
                {row.bookings.map(({ b, pos }) => (
                  <Link
                    key={b.code}
                    href={`/admin/bookings/${b.code}`}
                    className="ad-cal-bar-item"
                    data-status={b.status}
                    data-cut-start={pos!.cutStart ? "true" : undefined}
                    data-cut-end={pos!.cutEnd ? "true" : undefined}
                    style={{ gridColumn: `${pos!.col} / span ${pos!.span}` }}
                    title={`${b.code} · ${b.guest.name} · ${fmtDate(b.checkIn, "id", "short")} sampai ${fmtDate(b.checkOut, "id", "short")}`}
                  >
                    <span>{b.guest.name.split(" ")[0]}</span>
                  </Link>
                ))}
                {row.blocks.map(({ k, pos }) => (
                  <button
                    key={k.id}
                    type="button"
                    className="ad-cal-bar-item ad-cal-block"
                    data-reason={k.reason}
                    style={{ gridColumn: `${pos!.col} / span ${pos!.span}` }}
                    onClick={() => setSelected(k)}
                    title={`${REASON_LABEL[k.reason]} · ${fmtDate(k.from, "id", "short")} sampai ${fmtDate(k.to, "id", "short")}`}
                  >
                    <span>{REASON_LABEL[k.reason]}</span>
                  </button>
                ))}
              </div>
            ))}
          </div>
        </div>

        <p className="ad-legend">
          <span><i data-kind="paid" /> Perlu dikonfirmasi</span>
          <span><i data-kind="confirmed" /> Terkonfirmasi</span>
          <span><i data-kind="pending" /> Menunggu bayar</span>
          <span><i data-kind="checked_in" /> Sedang menginap</span>
          <span><i data-kind="completed" /> Selesai</span>
          <span><i data-kind="block" /> Ditutup manual</span>
        </p>
      </Card>

      <div className="ad-section-head">
        <div>
          <h2 className="ad-section-title">Tanggal ditutup</h2>
          <p className="ad-muted">Yang akan datang, paling dekat dulu.</p>
        </div>
      </div>
      {upcoming.length ? (
        <ol className="ad-records">
          {upcoming.map((k) => (
            <li key={k.id} className="ad-record">
              <button type="button" className="ad-record-main" onClick={() => setSelected(k)}>
                <span className="ad-record-text">
                  <strong>
                    {roomName(k.unit)} · {REASON_LABEL[k.reason]}
                  </strong>
                  <small className="tnum">
                    {fmtDate(k.from, "id", "day")} sampai {fmtDate(k.to, "id", "day")} · {nightsOf(k.from, k.to).length} malam
                    {k.note ? ` · ${k.note}` : ""}
                  </small>
                </span>
              </button>
              <RowActions label={`${roomName(k.unit)} ${fmtDate(k.from, "id", "short")}`} onEdit={() => openDialog(undefined, undefined, k)} onDelete={() => setReopening(k)} deleteLabel="Buka kembali" />
            </li>
          ))}
        </ol>
      ) : (
        <Empty>Tidak ada tanggal yang ditutup ke depan.</Empty>
      )}

      {prefill ? (
        <BlockDialog
          key={prefill.n}
          block={prefill.block}
          initialUnit={prefill.unit ?? rooms[0]?.unit}
          initialFrom={prefill.from}
          roomName={roomName}
          onClose={() => setPrefill(null)}
        />
      ) : null}

      <Dialog
        open={!!selected}
        onClose={() => setSelected(null)}
        title="Tanggal ditutup"
        footer={
          <>
            <button
              type="button"
              className="ad-btn ad-btn--danger"
              onClick={async () => {
                if (!selected) return;
                await deleteBlock(selected.id);
                setSelected(null);
                toast("Tanggal dibuka kembali");
              }}
            >
              <Trash2 size={14} strokeWidth={1.7} aria-hidden="true" />
              Buka kembali
            </button>
            <button
              type="button"
              className="ad-btn ad-btn--primary"
              onClick={() => {
                if (!selected) return;
                openDialog(undefined, undefined, selected);
                setSelected(null);
              }}
            >
              <Pencil size={14} strokeWidth={1.7} aria-hidden="true" />
              Ubah
            </button>
          </>
        }
      >
        {selected ? (
          <dl className="ad-dl ad-dl--one">
            <div>
              <dt>Kamar</dt>
              <dd>{roomName(selected.unit)}</dd>
            </div>
            <div>
              <dt>Tanggal</dt>
              <dd>
                {fmtDate(selected.from, "id", "day")} sampai {fmtDate(selected.to, "id", "day")} ({nightsOf(selected.from, selected.to).length} malam)
              </dd>
            </div>
            <div>
              <dt>Alasan</dt>
              <dd>{REASON_LABEL[selected.reason]}</dd>
            </div>
            {selected.note ? (
              <div>
                <dt>Catatan</dt>
                <dd>{selected.note}</dd>
              </div>
            ) : null}
          </dl>
        ) : null}
      </Dialog>

      <ConfirmDelete
        open={!!reopening}
        title="Buka kembali tanggal ini?"
        confirmLabel="Buka kembali"
        onCancel={() => setReopening(null)}
        onConfirm={async () => {
          if (!reopening) return;
          await deleteBlock(reopening.id);
          toast(`${roomName(reopening.unit)} dibuka kembali`);
          setReopening(null);
        }}
      >
        {reopening
          ? `${roomName(reopening.unit)}, ${fmtDate(reopening.from, "id", "day")} sampai ${fmtDate(reopening.to, "id", "day")}, bisa dipesan lagi di website. Pastikan kamarnya memang kosong di platform lain.`
          : null}
      </ConfirmDelete>
    </>
  );
}

/** Close dates, or change dates already closed (`block`). */
function BlockDialog({
  block,
  initialUnit,
  initialFrom,
  roomName,
  onClose,
}: {
  block?: Block;
  initialUnit?: UnitId;
  initialFrom?: string;
  roomName: (unit: UnitId) => string;
  onClose: () => void;
}) {
  const rooms = useRooms();
  const today = todayISO();
  const [unit, setUnit] = useState<UnitId>(block?.unit ?? initialUnit ?? "");
  const [from, setFrom] = useState(block?.from ?? initialFrom ?? today);
  const [to, setTo] = useState(block?.to ?? addDays(initialFrom ?? today, 1));
  const [reason, setReason] = useState<BlockReason>(block?.reason ?? "airbnb");
  const [note, setNote] = useState(block?.note ?? "");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const submit = async () => {
    setError(null);
    if (!unit) return setError("Pilih kamarnya.");
    if (to <= from) return setError("Tanggal akhir harus setelah tanggal awal.");
    setBusy(true);
    const input = { unit, from, to, reason, note: note.trim() || undefined };
    const res = block ? await updateBlock(block.id, input) : await createBlock(input);
    setBusy(false);
    if (!res.ok) return setError(`Tanggal ${fmtDate(res.clash, "id", "day")} sudah terisi. Pilih rentang lain atau batalkan booking-nya dulu.`);
    toast(block ? "Tanggal ditutup diperbarui" : `${roomName(unit)} ditutup ${nightsOf(from, to).length} malam`);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={block ? "Ubah tanggal ditutup" : "Tutup tanggal"}
      lead="Tanggal ini tidak bisa dipesan di website."
      footer={<SheetFooter busy={busy} onCancel={onClose} onSave={submit} saveLabel={block ? "Simpan" : "Tutup tanggal"} />}
    >
      <section className="ad-form-sec">
        <p className="ad-muted">Untuk kamar yang sudah terjual di Airbnb, Booking.com atau platform lain, sedang dalam perawatan, atau dipakai sendiri.</p>
        <div className="sv-input">
          <label htmlFor="b-unit">Kamar</label>
          <select id="b-unit" value={unit} onChange={(e) => setUnit(e.target.value)}>
            {rooms.map((r) => (
              <option key={r.unit} value={r.unit}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div className="ad-grid-2">
          <div className="sv-input">
            <label htmlFor="b-from">Dari (malam pertama)</label>
            <input id="b-from" type="date" value={from} min={today} onChange={(e) => setFrom(e.target.value)} />
          </div>
          <div className="sv-input">
            <label htmlFor="b-to">Sampai (hari keluar)</label>
            <input id="b-to" type="date" value={to} min={addDays(from, 1)} onChange={(e) => setTo(e.target.value)} />
          </div>
        </div>
        <div className="sv-input">
          <label htmlFor="b-reason">Alasan</label>
          <select id="b-reason" value={reason} onChange={(e) => setReason(e.target.value as BlockReason)}>
            {(Object.keys(REASON_LABEL) as BlockReason[]).map((r) => (
              <option key={r} value={r}>
                {REASON_LABEL[r]}
              </option>
            ))}
          </select>
        </div>
        <div className="sv-input">
          <label htmlFor="b-note">Catatan (opsional)</label>
          <input id="b-note" value={note} onChange={(e) => setNote(e.target.value)} placeholder="Misal: kode booking Airbnb HMXXXX" />
        </div>
      </section>
      {error ? (
        <p className="sv-bk-alert" role="alert">
          {error}
        </p>
      ) : null}
    </Sheet>
  );
}
