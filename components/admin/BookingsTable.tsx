"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Clock, Plus, Search } from "lucide-react";
import Decision from "./Decision";
import { Empty, PageHeader, Sheet, SheetFooter, StatusPill, toast } from "./ui";
import { dict } from "@/content/dict";
import { useBookings, useNow, useRoomName, useRooms } from "@/lib/booking/hooks";
import { createBooking } from "@/lib/booking/api";
import { addDays, fmtDate, fmtDateTime, formatPhone, idr, isValidEmail, normalizePhone, todayISO } from "@/lib/booking/format";
import { STATUS_GROUP, type Booking, type StatusGroup, type UnitId } from "@/lib/booking/types";

/**
 * The admin's first screen: who has booked.
 *
 * It opens on what needs a decision. A guest who has paid is waiting for
 * someone here to accept or reject, so those bookings come first, each with
 * Terima and Tolak on the row itself. Everything else is one tab away:
 * unpaid, confirmed, finished, and the ones that fell through.
 *
 * Searchable by code, name, email or phone. On a phone each row becomes a
 * card. "Booking manual" is for stays agreed on WhatsApp or by phone; a room
 * sold on another platform is closed in Kalender instead.
 */

type Tab = StatusGroup | "all";

const TABS: { id: Tab; label: string; empty: string }[] = [
  { id: "review", label: "Perlu dikonfirmasi", empty: "Tidak ada pesanan yang menunggu konfirmasi. Semua sudah diurus." },
  { id: "unpaid", label: "Menunggu bayar", empty: "Tidak ada pesanan yang menunggu pembayaran." },
  { id: "confirmed", label: "Terkonfirmasi", empty: "Belum ada pesanan terkonfirmasi." },
  { id: "done", label: "Selesai", empty: "Belum ada tamu yang selesai menginap." },
  { id: "closed", label: "Ditolak / batal", empty: "Tidak ada pesanan yang ditolak, dibatalkan, atau kedaluwarsa." },
  { id: "all", label: "Semua", empty: "Belum ada booking." },
];

export default function BookingsTable() {
  const params = useSearchParams();
  const bookings = useBookings();
  const rooms = useRooms();
  const roomName = useRoomName();
  const now = useNow(30_000);
  const [tab, setTab] = useState<Tab>(() => {
    const wanted = params.get("tab") as Tab | null;
    if (wanted && TABS.some((t) => t.id === wanted)) return wanted;
    return bookings.some((b) => b.status === "paid") ? "review" : "all";
  });
  const [unit, setUnit] = useState<"all" | UnitId>("all");
  const [q, setQ] = useState("");
  const [manual, setManual] = useState(false);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: bookings.length };
    for (const b of bookings) c[STATUS_GROUP[b.status]] = (c[STATUS_GROUP[b.status]] ?? 0) + 1;
    return c;
  }, [bookings]);

  const rows = useMemo(() => {
    const needle = q.trim().toLowerCase();
    const digits = needle.replace(/\D/g, "");
    const list = bookings
      .filter((b) => tab === "all" || STATUS_GROUP[b.status] === tab)
      .filter((b) => unit === "all" || b.units.includes(unit))
      .filter(
        (b) =>
          !needle ||
          b.code.toLowerCase().includes(needle) ||
          b.guest.name.toLowerCase().includes(needle) ||
          b.guest.email.toLowerCase().includes(needle) ||
          (digits.length >= 3 && b.guest.phone.replace(/\D/g, "").includes(digits.replace(/^0/, ""))),
      );
    /* Waiting for a decision: longest wait first. Otherwise newest first, with
       anything still waiting floated to the top of "Semua". */
    const paidAt = (b: Booking) => b.payment.paidAt ?? b.createdAt;
    return list.sort((a, b) => {
      if (tab === "review") return paidAt(a).localeCompare(paidAt(b));
      if (tab === "confirmed") return a.checkIn.localeCompare(b.checkIn);
      const wa = a.status === "paid" ? 0 : 1;
      const wb = b.status === "paid" ? 0 : 1;
      return wa - wb || b.createdAt.localeCompare(a.createdAt);
    });
  }, [bookings, tab, unit, q]);

  const current = TABS.find((t) => t.id === tab)!;

  return (
    <>
      <PageHeader
        title="Booking"
        lead="Semua orang yang memesan. Yang sudah membayar menunggu Anda: terima atau tolak."
        actions={
          <button type="button" className="ad-btn ad-btn--primary" onClick={() => setManual(true)}>
            <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
            Booking manual
          </button>
        }
      />

      <div className="ad-tabs" role="tablist" aria-label="Status">
        {TABS.map((t) => (
          <button key={t.id} type="button" role="tab" aria-selected={tab === t.id} className="ad-tab" data-attention={t.id === "review" && counts.review ? "true" : undefined} onClick={() => setTab(t.id)}>
            {t.label}
            <span className="tnum">{counts[t.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="ad-toolbar">
        <label className="ad-search">
          <Search size={16} strokeWidth={1.6} aria-hidden="true" />
          <span className="sr-only">Cari</span>
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Cari kode, nama, email, atau nomor" />
        </label>
        <select className="ad-select" value={unit} onChange={(e) => setUnit(e.target.value as typeof unit)} aria-label="Kamar">
          <option value="all">Semua kamar</option>
          {rooms.map((r) => (
            <option key={r.unit} value={r.unit}>
              {r.name}
            </option>
          ))}
        </select>
      </div>

      {rows.length ? (
        <div className="ad-table-wrap">
          <table className="ad-table">
            <thead>
              <tr>
                <th scope="col">Kode</th>
                <th scope="col">Tamu</th>
                <th scope="col">Kamar</th>
                <th scope="col">Menginap</th>
                <th scope="col" className="ad-num">Total</th>
                <th scope="col">Status</th>
                <th scope="col">Tindakan</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((b) => (
                <tr key={b.code} data-waiting={b.status === "paid" ? "true" : undefined}>
                  <td data-label="Kode">
                    <Link href={`/admin/bookings/${b.code}`} className="ad-code tnum">
                      {b.code}
                    </Link>
                    <small className="tnum">{fmtDateTime(b.createdAt, "id")}{b.source === "admin" ? " · manual" : ""}</small>
                  </td>
                  <td data-label="Tamu">
                    <strong>{b.guest.name}</strong>
                    <small className="tnum">{formatPhone(b.guest.phone)}</small>
                  </td>
                  <td data-label="Kamar">{b.units.map(roomName).join(", ")}</td>
                  <td data-label="Menginap" className="tnum">
                    {fmtDate(b.checkIn, "id", "short")} → {fmtDate(b.checkOut, "id", "short")}
                    <small>
                      {b.quote.nights} malam · {b.guests} orang
                    </small>
                  </td>
                  <td data-label="Total" className="ad-num tnum">
                    {idr(b.quote.total)}
                    {b.quote.promo ? <small>promo {b.quote.promo.code}</small> : null}
                  </td>
                  <td data-label="Status">
                    <StatusPill status={b.status} />
                    {b.status === "paid" && b.payment.paidAt ? (
                      <small className="ad-wait tnum">
                        <Clock size={12} strokeWidth={1.8} aria-hidden="true" />
                        menunggu {since(b.payment.paidAt, now)}
                      </small>
                    ) : null}
                  </td>
                  <td data-label="Tindakan">
                    {b.status === "paid" ? (
                      <Decision booking={b} compact />
                    ) : (
                      <Link href={`/admin/bookings/${b.code}`} className="ad-link">
                        Lihat <ArrowRight size={13} strokeWidth={1.6} aria-hidden="true" />
                      </Link>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <Empty>{q || unit !== "all" ? "Tidak ada booking yang cocok dengan pencarian ini." : current.empty}</Empty>
      )}

      <ManualBooking open={manual} onClose={() => setManual(false)} />
    </>
  );
}

/** "2 jam", "35 menit": how long a guest has been waiting. */
function since(iso: string, now: number) {
  const m = Math.max(0, Math.round((now - Date.parse(iso)) / 60_000));
  if (m < 60) return `${m} menit`;
  const h = Math.floor(m / 60);
  return h < 48 ? `${h} jam` : `${Math.floor(h / 24)} hari`;
}

function ManualBooking({ open, onClose }: { open: boolean; onClose: () => void }) {
  const router = useRouter();
  const unitName = useRoomName();
  const rooms = useRooms();
  const today = todayISO();
  const [form, setForm] = useState({
    units: [] as UnitId[],
    checkIn: today,
    checkOut: addDays(today, 1),
    guests: 2,
    name: "",
    email: "",
    phone: "",
    notes: "",
    promo: "",
    paid: true,
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError(null);
    if (!form.units.length) return setError("Pilih minimal satu kamar.");
    if (form.checkOut <= form.checkIn) return setError("Tanggal keluar harus setelah tanggal masuk.");
    if (!form.name.trim()) return setError("Isi nama tamu.");
    if (!normalizePhone(form.phone)) return setError("Nomor WhatsApp belum valid.");
    if (form.email && !isValidEmail(form.email)) return setError("Email belum valid. Kosongkan kalau tidak ada.");
    setBusy(true);
    const res = await createBooking({
      checkIn: form.checkIn,
      checkOut: form.checkOut,
      units: form.units,
      guests: form.guests,
      guest: { name: form.name, email: form.email, phone: form.phone },
      notes: form.notes,
      method: "manual",
      locale: "id",
      source: "admin",
      paid: form.paid,
      promoCode: form.promo.trim() || undefined,
    });
    setBusy(false);
    if (!res.ok) {
      setError(
        res.error === "unavailable"
          ? `${(res.units ?? []).map(unitName).join(", ")} sudah terisi di sebagian tanggal itu. Cek Kalender.`
          : res.error === "promo"
            ? dict.id.checkout.promoErr[res.promoError ?? "not_found"]
            : "Data belum lengkap.",
      );
      return;
    }
    toast(`Booking ${res.booking.code} dibuat`);
    onClose();
    router.push(`/admin/bookings/${res.booking.code}`);
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Booking manual"
      lead="Untuk tamu yang memesan lewat WhatsApp atau telepon."
      footer={<SheetFooter busy={busy} onCancel={onClose} onSave={submit} saveLabel="Simpan booking" />}
    >
      <section className="ad-form-sec">
        <h3>Menginap</h3>
        <p className="ad-muted">Tanggalnya langsung tertutup di kalender dan website. Kamar yang terjual di Airbnb atau platform lain cukup ditutup di Kalender.</p>
        <fieldset className="ad-fieldset">
          <legend>Kamar</legend>
          <div className="ad-checks">
            {rooms.map((r) => (
              <label key={r.unit} className="ad-check">
                <input
                  type="checkbox"
                  checked={form.units.includes(r.unit)}
                  onChange={(e) => set("units", e.target.checked ? [...form.units, r.unit] : form.units.filter((x) => x !== r.unit))}
                />
                {r.name}
              </label>
            ))}
          </div>
        </fieldset>
        <div className="ad-grid-2">
          <div className="sv-input">
            <label htmlFor="m-in">Check-in</label>
            <input id="m-in" type="date" value={form.checkIn} min={today} onChange={(e) => set("checkIn", e.target.value)} />
          </div>
          <div className="sv-input">
            <label htmlFor="m-out">Check-out</label>
            <input id="m-out" type="date" value={form.checkOut} min={addDays(form.checkIn, 1)} onChange={(e) => set("checkOut", e.target.value)} />
          </div>
          <div className="sv-input">
            <label htmlFor="m-guests">Jumlah tamu</label>
            <input id="m-guests" type="number" min={1} max={40} value={form.guests} onChange={(e) => set("guests", Math.max(1, Number(e.target.value) || 1))} />
          </div>
        </div>
      </section>
      <section className="ad-form-sec">
        <h3>Tamu</h3>
        <div className="sv-input">
          <label htmlFor="m-name">Nama tamu</label>
          <input id="m-name" value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="off" />
        </div>
        <div className="ad-grid-2">
          <div className="sv-input">
            <label htmlFor="m-phone">Nomor WhatsApp</label>
            <input id="m-phone" type="tel" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} placeholder="0812 3456 7890" />
          </div>
          <div className="sv-input">
            <label htmlFor="m-email">Email (opsional)</label>
            <input id="m-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
          </div>
        </div>
        <div className="sv-input">
          <label htmlFor="m-notes">Catatan</label>
          <textarea id="m-notes" rows={2} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </section>
      <section className="ad-form-sec">
        <h3>Pembayaran</h3>
        <div className="sv-input">
          <label htmlFor="m-promo">Kode promo (opsional)</label>
          <input id="m-promo" value={form.promo} onChange={(e) => set("promo", e.target.value.toUpperCase())} autoComplete="off" spellCheck={false} className="ad-code-input" />
        </div>
        <label className="ad-check">
          <input type="checkbox" checked={form.paid} onChange={(e) => set("paid", e.target.checked)} />
          Sudah dibayar (transfer atau tunai). Langsung terkonfirmasi, dan email konfirmasi dikirim kalau emailnya diisi.
        </label>
      </section>
      {error ? (
        <p className="sv-bk-alert" role="alert">
          {error}
        </p>
      ) : null}
    </Sheet>
  );
}
