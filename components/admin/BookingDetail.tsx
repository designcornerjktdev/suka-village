"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUpRight, Check, Clock, Info, LoaderCircle, Mail, MessageCircle, Pencil, Send, Trash2 } from "lucide-react";
import StorePhoto from "../StorePhoto";
import Decision from "./Decision";
import MessagePreview from "../booking/MessagePreview";
import { Card, ConfirmDelete, Dialog, Empty, PageHeader, Select, Sheet, SheetFooter, StatusPill, toast } from "./ui";
import { useBooking, useRooms, useSettings } from "@/lib/booking/hooks";
import { cancelBooking, DELETABLE, deleteBooking, markPaidManually, resendNotification, saveInternalNote, setBookingStatus, updateBooking } from "@/lib/booking/api";
import { fmtDate, fmtDateTime, formatPhone, idr, isValidEmail, normalizePhone, todayISO } from "@/lib/booking/format";
import { methodInfo } from "@/lib/booking/payments";
import { TEMPLATE_LABELS } from "@/lib/booking/notifications";
import type { Booking, TemplateId } from "@/lib/booking/types";

/**
 * One booking, everything the front desk needs: who, when, which rooms, what
 * was paid and how, every message that went out, a private note, and the
 * actions that fit its current state.
 *
 * The guest's details can be corrected (Ubah data tamu). A booking that never
 * became a stay, or no longer is one (cancelled, expired, rejected), can be
 * deleted; anything else is cancelled instead, so its history stays.
 */

function templateFor(b: Booking): TemplateId {
  if (b.status === "pending") return "awaiting_payment";
  if (b.status === "paid") return "payment_received";
  if (b.status === "rejected") return "rejected";
  if (b.status === "expired") return "expired";
  if (b.status === "cancelled") return "cancelled";
  return "confirmed";
}

export default function BookingDetail({ code }: { code: string }) {
  const booking = useBooking(code);

  if (booking === undefined) return null;
  if (!booking) {
    return (
      <>
        <PageHeader title="Booking tidak ditemukan" back={{ href: "/admin/bookings", label: "Semua booking" }} />
        <Empty>Kode {code} tidak ada di data. Mungkin sudah direset.</Empty>
      </>
    );
  }
  return <Detail booking={booking} />;
}

function Detail({ booking: b }: { booking: Booking }) {
  const settings = useSettings();
  const rooms = useRooms();
  const [busy, setBusy] = useState<string | null>(null);
  const [note, setNote] = useState(b.internalNote ?? "");
  const [paidOpen, setPaidOpen] = useState(false);
  const [paidRef, setPaidRef] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [template, setTemplate] = useState<TemplateId>(templateFor(b));
  const [editOpen, setEditOpen] = useState(0);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const router = useRouter();
  const method = methodInfo(b.payment.method);

  const run = async (key: string, task: () => Promise<unknown>, done: string) => {
    setBusy(key);
    await task();
    setBusy(null);
    toast(done);
  };

  /* A hand-written WhatsApp chat: free, because the admin sends it from their
     own WhatsApp. Automatic messages are email only. */
  const chat = `https://wa.me/${b.guest.phone.replace(/\D/g, "")}?text=${encodeURIComponent(
    `Halo ${b.guest.name.split(" ")[0]}, kami dari Suka Village. Terkait pesanan ${b.code} (${fmtDate(b.checkIn, "id", "short")} sampai ${fmtDate(b.checkOut, "id", "short")}): `,
  )}`;

  const actions = (
    <>
      {b.status === "paid" ? <Decision booking={b} /> : null}
      {b.status === "pending" ? (
        <button type="button" className="ad-btn ad-btn--primary" onClick={() => setPaidOpen(true)}>
          Sudah dibayar manual
        </button>
      ) : null}
      {/* Check in opens on the arrival day, not before: a tap on the wrong row
          should not mark a guest months away as present. */}
      {b.status === "confirmed" && b.checkIn <= todayISO() ? (
        <button type="button" className="ad-btn ad-btn--primary" disabled={!!busy} onClick={() => run("in", () => setBookingStatus(b.code, "checked_in"), "Tamu ditandai check-in")}>
          Check-in
        </button>
      ) : null}
      {b.status === "checked_in" ? (
        <button type="button" className="ad-btn ad-btn--primary" disabled={!!busy} onClick={() => run("out", () => setBookingStatus(b.code, "completed"), "Tamu ditandai check-out")}>
          Check-out
        </button>
      ) : null}
      {b.status === "pending" || b.status === "confirmed" ? (
        <button type="button" className="ad-btn ad-btn--danger" onClick={() => setCancelOpen(true)}>
          Batalkan
        </button>
      ) : null}
      {DELETABLE.includes(b.status) ? (
        <button type="button" className="ad-btn ad-btn--danger" onClick={() => setDeleteOpen(true)}>
          <Trash2 size={15} strokeWidth={1.7} aria-hidden="true" />
          Hapus booking
        </button>
      ) : null}
    </>
  );

  return (
    <>
      <PageHeader
        back={{ href: "/admin/bookings", label: "Semua booking" }}
        title={
          <span className="ad-title-code">
            <span className="tnum">{b.code}</span>
            <StatusPill status={b.status} />
          </span>
        }
        lead={`Dibuat ${fmtDateTime(b.createdAt, "id")} · ${b.source === "admin" ? "dicatat admin" : "dari website"} · bahasa ${b.locale === "id" ? "Indonesia" : "Inggris"}`}
        actions={actions}
      />

      {b.status === "paid" ? (
        <p className="ad-banner" data-kind="wait" role="status">
          <Clock size={18} strokeWidth={1.6} aria-hidden="true" />
          <span>
            <strong>Menunggu keputusan Anda.</strong> {b.guest.name} sudah membayar {idr(b.payment.amount)}
            {b.payment.paidAt ? ` pada ${fmtDateTime(b.payment.paidAt, "id")}` : ""} dan sedang menunggu. Periksa kamarnya, lalu terima atau tolak.
          </span>
        </p>
      ) : null}
      {b.status === "rejected" ? (
        <p className="ad-banner" data-kind="refund" role="status">
          <Info size={18} strokeWidth={1.6} aria-hidden="true" />
          <span>
            <strong>Ditolak{b.rejectReason ? `: ${b.rejectReason}` : "."}</strong> Tamu sudah membayar {idr(b.payment.amount)}. Pastikan
            uangnya dikembalikan, lalu catat di catatan internal.
          </span>
        </p>
      ) : null}

      <div className="ad-cols ad-cols--detail">
        <div className="ad-stack">
          <Card
            title="Tamu"
            actions={
              <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setEditOpen((n) => n + 1)}>
                <Pencil size={14} strokeWidth={1.7} aria-hidden="true" />
                Ubah data tamu
              </button>
            }
          >
            <dl className="ad-dl">
              <div>
                <dt>Nama</dt>
                <dd>{b.guest.name}</dd>
              </div>
              <div>
                <dt>WhatsApp</dt>
                <dd className="tnum">{formatPhone(b.guest.phone)}</dd>
              </div>
              <div>
                <dt>Email</dt>
                <dd>
                  {b.guest.email ? (
                    <a className="ad-link" href={`mailto:${b.guest.email}`}>
                      {b.guest.email}
                    </a>
                  ) : (
                    <span className="ad-muted">Tidak ada</span>
                  )}
                </dd>
              </div>
              <div>
                <dt>Jumlah tamu</dt>
                <dd className="tnum">{b.guests} orang</dd>
              </div>
              {b.notes ? (
                <div className="ad-dl-wide">
                  <dt>Catatan dari tamu</dt>
                  <dd>{b.notes}</dd>
                </div>
              ) : null}
            </dl>
            <a className="ad-btn ad-btn--ghost ad-chat" href={chat} target="_blank" rel="noopener noreferrer">
              <MessageCircle size={15} strokeWidth={1.6} aria-hidden="true" />
              Chat tamu di WhatsApp
              <ArrowUpRight size={13} strokeWidth={1.6} aria-hidden="true" />
            </a>
          </Card>

          <Card title="Menginap">
            <div className="ad-stay">
              <div>
                <span className="ad-stay-label">Check-in</span>
                <strong>{fmtDate(b.checkIn, "id", "day")}</strong>
              </div>
              <span className="ad-stay-nights tnum">{b.quote.nights} malam</span>
              <div>
                <span className="ad-stay-label">Check-out</span>
                <strong>{fmtDate(b.checkOut, "id", "day")}</strong>
              </div>
            </div>
            <ul className="ad-rooms">
              {b.quote.lines.map((line) => {
                const room = rooms.find((x) => x.unit === line.unit);
                return (
                  <li key={line.unit}>
                    <span className="ad-rooms-thumb">{room?.photos[0] ? <StorePhoto src={room.photos[0]} alt="" sizes="56px" /> : null}</span>
                    <span className="ad-rooms-main">
                      <strong>{room?.name ?? line.unit}</strong>
                      <small className="tnum">
                        {line.nights.map((n) => `${fmtDate(n.date, "id", "short")} ${idr(n.rate)}${n.kind === "weekend" ? " (akhir pekan)" : n.kind === "season" ? " (musim)" : ""}`).join(" · ")}
                      </small>
                    </span>
                    <span className="tnum">{idr(line.subtotal)}</span>
                  </li>
                );
              })}
            </ul>
            {b.quote.promo ? (
              <p className="ad-discount">
                <span>
                  Kode promo <strong>{b.quote.promo.code}</strong>
                  <small className="tnum">Subtotal {idr(b.quote.subtotal ?? b.quote.total)}</small>
                </span>
                <span className="tnum">−{idr(b.quote.promo.discount)}</span>
              </p>
            ) : null}
            <p className="sv-bk-total">
              <span>Total</span>
              <strong className="tnum">{idr(b.quote.total)}</strong>
            </p>
          </Card>

          <Card title="Email ke tamu">
            {b.notifications.length ? (
              <ul className="ad-notes">
                {[...b.notifications].reverse().map((n) => (
                  <li key={n.id}>
                    <Mail size={15} strokeWidth={1.6} aria-hidden="true" />
                    <span>
                      <strong>{TEMPLATE_LABELS[n.template]}</strong>
                      <small className="tnum">
                        ke {n.to} · {fmtDateTime(n.at, "id")}
                      </small>
                    </span>
                    <span className="ad-tag">{n.status === "simulated" ? "simulasi" : n.status === "sent" ? "terkirim" : "gagal"}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <Empty>{b.guest.email ? "Belum ada email terkirim." : "Tamu ini tidak punya email, jadi tidak ada email otomatis."}</Empty>
            )}

            <div className="ad-resend">
              <div className="sv-input">
                <label htmlFor="tpl">Kirim ulang email</label>
                <Select id="tpl" value={template} onChange={setTemplate} options={(Object.keys(TEMPLATE_LABELS) as TemplateId[]).map((k) => ({ value: k, label: TEMPLATE_LABELS[k] }))} />
              </div>
              <button type="button" className="ad-btn ad-btn--ghost" disabled={!!busy || !b.guest.email} onClick={() => run("em", () => resendNotification(b.code, template), "Email dikirim ulang (simulasi)")}>
                <Send size={14} strokeWidth={1.6} aria-hidden="true" />
                Kirim
              </button>
            </div>
            <details className="ad-details">
              <summary>Lihat isi email &quot;{TEMPLATE_LABELS[template]}&quot;</summary>
              <MessagePreview booking={b} template={template} settings={settings} locale={b.locale} />
            </details>
          </Card>
        </div>

        <div className="ad-stack">
          <Card title="Pembayaran">
            <dl className="ad-dl ad-dl--one">
              <div>
                <dt>Cara bayar</dt>
                <dd>{method.label}</dd>
              </div>
              <div>
                <dt>Jumlah</dt>
                <dd className="tnum">{idr(b.payment.amount)}</dd>
              </div>
              <div>
                <dt>Status</dt>
                <dd>
                  {b.payment.status === "paid" ? (b.status === "rejected" ? "Sudah dibayar, perlu dikembalikan" : "Sudah dibayar") : b.payment.status === "pending" ? "Belum dibayar" : b.payment.status === "expired" ? "Kedaluwarsa" : b.payment.status}
                </dd>
              </div>
              {b.payment.paidAt ? (
                <div>
                  <dt>Dibayar</dt>
                  <dd className="tnum">{fmtDateTime(b.payment.paidAt, "id")}</dd>
                </div>
              ) : (
                <div>
                  <dt>Batas bayar</dt>
                  <dd className="tnum">{fmtDateTime(b.payment.expiresAt, "id")}</dd>
                </div>
              )}
              <div>
                <dt>Referensi</dt>
                <dd className="ad-mono">{b.payment.reference || "–"}</dd>
              </div>
            </dl>
            <Link href={`/${b.locale}/booking/${b.code}`} target="_blank" className="ad-link">
              Halaman pesanan tamu <ArrowUpRight size={13} strokeWidth={1.6} aria-hidden="true" />
            </Link>
          </Card>

          <Card title="Catatan internal">
            <p className="ad-muted">Hanya terlihat oleh admin.</p>
            <div className="sv-input">
              <label htmlFor="inote" className="sr-only">
                Catatan internal
              </label>
              <textarea id="inote" rows={4} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Misal: minta extra bed, tiba sekitar jam 3 sore" />
            </div>
            <button
              type="button"
              className="ad-btn ad-btn--ghost"
              disabled={busy === "note" || note === (b.internalNote ?? "")}
              onClick={() => run("note", () => saveInternalNote(b.code, note), "Catatan disimpan")}
            >
              {busy === "note" ? <LoaderCircle className="sv-spin" size={14} strokeWidth={1.8} aria-hidden="true" /> : <Check size={14} strokeWidth={1.8} aria-hidden="true" />}
              Simpan catatan
            </button>
          </Card>

          <Card title="Riwayat">
            <ol className="ad-feed">
              {[...b.history].reverse().map((h, i) => (
                <li key={i}>
                  <span className="ad-feed-dot" data-by={h.by} aria-hidden="true" />
                  <span>
                    {h.event}
                    <small>
                      {h.by === "guest" ? "Tamu" : h.by === "admin" ? (h.adminName ?? "Admin") : h.by === "gateway" ? "Payment gateway" : "Sistem"} · {fmtDateTime(h.at, "id")}
                    </small>
                  </span>
                </li>
              ))}
            </ol>
          </Card>
        </div>
      </div>

      <Dialog
        open={paidOpen}
        onClose={() => setPaidOpen(false)}
        title="Sudah dibayar manual"
        footer={
          <>
            <button type="button" className="ad-btn ad-btn--ghost" onClick={() => setPaidOpen(false)}>
              Batal
            </button>
            <button
              type="button"
              className="ad-btn ad-btn--primary"
              disabled={!!busy}
              onClick={async () => {
                await run("paid", () => markPaidManually(b.code, paidRef), "Dibayar dan dikonfirmasi. Email konfirmasi terkirim.");
                setPaidOpen(false);
              }}
            >
              Tandai dibayar & konfirmasi
            </button>
          </>
        }
      >
        <p className="ad-muted">
          Untuk pembayaran di luar payment gateway, misalnya transfer langsung atau tunai. Karena Anda sendiri yang memeriksa
          uangnya, pesanan langsung terkonfirmasi dan email konfirmasi dikirim ke tamu.
        </p>
        <div className="sv-input">
          <label htmlFor="pref">Keterangan (opsional)</label>
          <input id="pref" value={paidRef} onChange={(e) => setPaidRef(e.target.value)} placeholder="Misal: transfer BCA a.n. Rina, 12 Okt" />
        </div>
      </Dialog>

      {editOpen ? <GuestSheet key={editOpen} booking={b} onClose={() => setEditOpen(0)} /> : null}

      <ConfirmDelete
        open={deleteOpen}
        title={`Hapus booking ${b.code}?`}
        onCancel={() => setDeleteOpen(false)}
        onConfirm={async () => {
          const res = await deleteBooking(b.code);
          setDeleteOpen(false);
          if (!res.ok) return toast("Booking ini tidak bisa dihapus");
          toast(`Booking ${b.code} dihapus`);
          router.replace("/admin/bookings");
        }}
      >
        Booking ini {b.status === "rejected" ? "sudah ditolak" : b.status === "expired" ? "sudah kedaluwarsa" : "sudah dibatalkan"} dan tidak memegang tanggal apa pun. Menghapusnya
        menghilangkan data tamu dan riwayatnya dari admin untuk selamanya.
        {b.status === "rejected" ? " Pastikan uang tamu sudah dikembalikan sebelum menghapus." : ""}
      </ConfirmDelete>

      <Dialog
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        title={`Batalkan ${b.code}?`}
        footer={
          <>
            <button type="button" className="ad-btn ad-btn--ghost" onClick={() => setCancelOpen(false)}>
              Tidak jadi
            </button>
            <button
              type="button"
              className="ad-btn ad-btn--danger"
              disabled={!!busy}
              onClick={async () => {
                await run("cancel", () => cancelBooking(b.code, "admin", cancelReason), "Booking dibatalkan");
                setCancelOpen(false);
              }}
            >
              Ya, batalkan
            </button>
          </>
        }
      >
        <p className="ad-muted">
          Kamar dilepas dan tamu menerima email pembatalan. {b.status === "confirmed" ? "Tamu sudah membayar: pengembalian dana diurus terpisah sesuai kebijakan." : ""}
        </p>
        <div className="sv-input">
          <label htmlFor="creason">Alasan (opsional)</label>
          <input id="creason" value={cancelReason} onChange={(e) => setCancelReason(e.target.value)} />
        </div>
      </Dialog>
    </>
  );
}


/** Correct who the booking is for. Dates and rooms are not edited here. */
function GuestSheet({ booking: b, onClose }: { booking: Booking; onClose: () => void }) {
  const [form, setForm] = useState({ name: b.guest.name, email: b.guest.email, phone: formatPhone(b.guest.phone), guests: b.guests, notes: b.notes ?? "" });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const set = <K extends keyof typeof form>(k: K, v: (typeof form)[K]) => {
    setError(null);
    setForm((f) => ({ ...f, [k]: v }));
  };

  const save = async () => {
    if (!form.name.trim()) return setError("Isi nama tamu.");
    if (!normalizePhone(form.phone)) return setError("Nomor WhatsApp belum valid.");
    if (form.email.trim() && !isValidEmail(form.email)) return setError("Email belum valid.");
    if (b.source === "website" && !form.email.trim()) return setError("Booking dari website butuh email: semua pemberitahuan dikirim ke sana.");
    setBusy(true);
    const res = await updateBooking(b.code, { guest: { name: form.name, email: form.email, phone: form.phone }, guests: form.guests, notes: form.notes });
    setBusy(false);
    if (!res.ok) return setError("Data belum lengkap.");
    toast("Data tamu disimpan");
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title="Ubah data tamu"
      lead={`${b.code} · ${fmtDate(b.checkIn, "id", "short")} → ${fmtDate(b.checkOut, "id", "short")}`}
      footer={<SheetFooter busy={busy} onCancel={onClose} onSave={save} />}
    >
      <section className="ad-form-sec">
        <h3>Tamu</h3>
        <div className="sv-input">
          <label htmlFor="g-name">Nama</label>
          <input id="g-name" value={form.name} onChange={(e) => set("name", e.target.value)} autoComplete="off" />
        </div>
        <div className="ad-grid-2">
          <div className="sv-input">
            <label htmlFor="g-phone">Nomor WhatsApp</label>
            <input id="g-phone" type="tel" inputMode="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} />
          </div>
          <div className="sv-input">
            <label htmlFor="g-guests">Jumlah tamu</label>
            <input id="g-guests" type="number" inputMode="numeric" min={1} max={40} value={form.guests} onChange={(e) => set("guests", Math.max(1, Number(e.target.value) || 1))} />
          </div>
        </div>
        <div className="sv-input">
          <label htmlFor="g-email">Email{b.source === "admin" ? " (opsional)" : ""}</label>
          <input id="g-email" type="email" value={form.email} onChange={(e) => set("email", e.target.value)} />
        </div>
        <div className="sv-input">
          <label htmlFor="g-notes">Catatan dari tamu</label>
          <textarea id="g-notes" rows={3} value={form.notes} onChange={(e) => set("notes", e.target.value)} />
        </div>
      </section>
      <p className="ad-note">
        <Info size={15} strokeWidth={1.6} aria-hidden="true" />
        Tanggal dan kamar tidak bisa diubah di sini supaya ketersediaan dan pembayarannya tetap benar. Untuk pindah tanggal, batalkan lalu buat booking manual baru.
      </p>
      {error ? (
        <p className="sv-bk-alert" role="alert">
          {error}
        </p>
      ) : null}
    </Sheet>
  );
}
