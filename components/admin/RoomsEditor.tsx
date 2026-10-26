"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronDown, Info, Plus, Trash2 } from "lucide-react";
import type { Feature } from "@/content/site";
import { dict } from "@/content/dict";
import StorePhoto from "../StorePhoto";
import PhotoManager from "./PhotoManager";
import { Card, Dialog, PageHeader, SaveBar, Toggle, toast } from "./ui";
import { useRates, useRooms } from "@/lib/booking/hooks";
import { archiveRoom, createRoom, saveRate, saveRoom } from "@/lib/booking/api";
import { addDays, idr, todayISO, uid } from "@/lib/booking/format";
import { DEMO } from "@/lib/booking/config";
import type { Room, UnitRate } from "@/lib/booking/types";

/**
 * Everything about a room, in one place: what it is (name, size, bedrooms,
 * bathrooms, what is in it), how it is described in both languages, its
 * photographs, and what it costs.
 *
 *   weekday   Sunday to Thursday nights
 *   weekend   Friday and Saturday nights
 *   seasons   date ranges with their own nightly price (holidays, peak)
 *
 * The website's prices come only from here. Each room saves on its own, so a
 * half edited villa never blocks saving a cabin.
 *
 * Rooms can be added and removed. A new room starts off sale; a removed room
 * is archived, not erased, and only once no upcoming booking holds it.
 */

const FEATURES = Object.keys(dict.id.rooms.features) as Feature[];

export default function RoomsEditor() {
  const rooms = useRooms();
  const rates = useRates();
  const [openId, setOpenId] = useState<string | null>(rooms[0]?.unit ?? null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");

  const add = async () => {
    const room = await createRoom(newName);
    setAdding(false);
    setNewName("");
    setOpenId(room.unit);
    toast(`${room.name} ditambahkan. Lengkapi lalu nyalakan "Bisa dipesan online".`);
  };

  return (
    <>
      <PageHeader
        title="Kamar & harga"
        lead="Nama, ukuran, fasilitas, deskripsi, foto, dan harga tiap kamar. Kamar baru bisa ditambah, kamar lama bisa dihapus."
        actions={
          <button type="button" className="ad-btn ad-btn--primary" onClick={() => setAdding(true)}>
            <Plus size={15} strokeWidth={1.8} aria-hidden="true" />
            Tambah kamar
          </button>
        }
      />
      {DEMO ? (
        <p className="ad-note ad-note--warn">
          <Info size={15} strokeWidth={1.6} aria-hidden="true" />
          Harga di bawah masih contoh untuk prototipe. Isi dengan harga asli sebelum situs dibuka untuk umum.
        </p>
      ) : null}
      <div className="ad-stack">
        {rooms.map((room) => {
          const rate = rates.find((r) => r.unit === room.unit);
          if (!rate) return null;
          return (
            <RoomCard
              key={room.unit}
              room={room}
              rate={rate}
              open={openId === room.unit}
              onToggle={() => setOpenId(openId === room.unit ? null : room.unit)}
            />
          );
        })}
      </div>

      <Dialog
        open={adding}
        onClose={() => setAdding(false)}
        title="Tambah kamar"
        footer={
          <>
            <button type="button" className="ad-btn ad-btn--ghost" onClick={() => setAdding(false)}>
              Batal
            </button>
            <button type="button" className="ad-btn ad-btn--primary" onClick={add} disabled={!newName.trim()}>
              Tambah
            </button>
          </>
        }
      >
        <p className="ad-muted">Kamar baru belum dijual online. Isi ukuran, foto, dan harganya dulu, lalu nyalakan &quot;Bisa dipesan online&quot;.</p>
        <div className="sv-input">
          <label htmlFor="new-room">Nama kamar</label>
          <input id="new-room" value={newName} onChange={(e) => setNewName(e.target.value)} placeholder="Misal: Garden Cabin" autoComplete="off" />
        </div>
      </Dialog>
    </>
  );
}

function RoomCard({ room, rate, open, onToggle }: { room: Room; rate: UnitRate; open: boolean; onToggle: () => void }) {
  const [draft, setDraft] = useState<Room>(room);
  const [price, setPrice] = useState<UnitRate>(rate);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [removing, setRemoving] = useState(false);
  const [blockedBy, setBlockedBy] = useState<string[] | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(room) || JSON.stringify(price) !== JSON.stringify(rate);
  const today = todayISO();
  const u = room.unit;

  const set = <K extends keyof Room>(k: K, v: Room[K]) => {
    setSaved(false);
    setDraft((d) => ({ ...d, [k]: v }));
  };
  const setP = <K extends keyof UnitRate>(k: K, v: UnitRate[K]) => {
    setSaved(false);
    setPrice((d) => ({ ...d, [k]: v }));
  };

  const number = (label: string, value: number, onChange: (n: number) => void, id: string, max = 999) => (
    <div className="sv-input">
      <label htmlFor={id}>{label}</label>
      <input id={id} type="number" inputMode="numeric" min={1} max={max} value={value} onChange={(e) => onChange(Math.max(1, Number(e.target.value) || 1))} />
    </div>
  );

  const money = (label: string, value: number, onChange: (n: number) => void, id: string) => (
    <div className="sv-input">
      <label htmlFor={id}>{label}</label>
      <div className="ad-money">
        <span aria-hidden="true">Rp</span>
        <input id={id} inputMode="numeric" value={value ? value.toLocaleString("id-ID") : ""} onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)} />
      </div>
    </div>
  );

  return (
    <Card className="ad-item" id={`room-${u}`}>
      <button type="button" className="ad-item-head" onClick={onToggle} aria-expanded={open}>
        <span className="ad-item-thumb">{draft.photos[0] ? <StorePhoto src={draft.photos[0]} alt="" sizes="56px" /> : <span aria-hidden="true">–</span>}</span>
        <span className="ad-item-title">
          <strong>{draft.name || "(tanpa nama)"}</strong>
          <small className="tnum">
            {draft.size} m² · {draft.bedrooms} kamar tidur ·{" "}
            {price.weekday && price.weekend ? `mulai ${idr(Math.min(price.weekday, price.weekend))} / malam` : "harga belum diisi"}
            {price.bookable ? "" : " · tidak dijual online"}
          </small>
        </span>
        {dirty ? <span className="ad-tag ad-tag--warn">belum disimpan</span> : null}
        <ChevronDown size={18} strokeWidth={1.6} aria-hidden="true" className="ad-item-chevron" data-open={open ? "true" : undefined} />
      </button>

      {open ? (
        <div className="ad-item-body">
          {/* --- What it is ---------------------------------------------- */}
          <section className="ad-block">
            <h3 className="ad-block-title">Info kamar</h3>
            <div className="ad-grid-4">
              <div className="sv-input ad-span-2">
                <label htmlFor={`rn-${u}`}>Nama kamar</label>
                <input id={`rn-${u}`} value={draft.name} onChange={(e) => set("name", e.target.value)} />
              </div>
              {number("Luas (m²)", draft.size, (n) => set("size", n), `rs-${u}`)}
              <div className="sv-input">
                <label htmlFor={`mg-${u}`}>Maks tamu</label>
                <input
                  id={`mg-${u}`}
                  type="number"
                  inputMode="numeric"
                  min={1}
                  max={60}
                  value={price.maxGuests ?? ""}
                  placeholder="Belum diatur"
                  onChange={(e) => setP("maxGuests", e.target.value ? Math.max(1, Number(e.target.value)) : undefined)}
                />
              </div>
              {number("Kamar tidur", draft.bedrooms, (n) => set("bedrooms", n), `rb-${u}`, 20)}
              {number("Kamar mandi", draft.bathrooms, (n) => set("bathrooms", n), `rt-${u}`, 20)}
            </div>

            <fieldset className="ad-fieldset">
              <legend>Fasilitas di dalam kamar</legend>
              <div className="ad-checks">
                {FEATURES.map((f) => (
                  <label key={f} className="ad-check">
                    <input
                      type="checkbox"
                      checked={draft.features.includes(f)}
                      onChange={(e) => set("features", e.target.checked ? FEATURES.filter((x) => x === f || draft.features.includes(x)) : draft.features.filter((x) => x !== f))}
                    />
                    {dict.id.rooms.features[f]}
                  </label>
                ))}
              </div>
            </fieldset>

            <div className="ad-bilingual">
              <div className="sv-input">
                <label htmlFor={`rd-id-${u}`}>Deskripsi · Indonesia</label>
                <textarea id={`rd-id-${u}`} rows={3} value={draft.description.id} onChange={(e) => set("description", { ...draft.description, id: e.target.value })} />
              </div>
              <div className="sv-input">
                <label htmlFor={`rd-en-${u}`}>Deskripsi · English</label>
                <textarea id={`rd-en-${u}`} rows={3} value={draft.description.en} onChange={(e) => set("description", { ...draft.description, en: e.target.value })} />
              </div>
            </div>
          </section>

          {/* --- Photographs --------------------------------------------- */}
          <section className="ad-block">
            <h3 className="ad-block-title">Foto</h3>
            <p className="ad-hint">Tiga foto pertama tampil di slider halaman Kamar; semua foto tampil di slider besar halaman kamar ini. Foto pertama jadi sampul.</p>
            <PhotoManager photos={draft.photos} onChange={(next) => set("photos", next)} emptyHint="Belum ada foto untuk kamar ini." />
          </section>

          {/* --- Price and rules ----------------------------------------- */}
          <section className="ad-block">
            <h3 className="ad-block-title">Harga & aturan pemesanan</h3>
            <div className="ad-grid-3">
              {money("Harga weekday (Min–Kam)", price.weekday, (n) => setP("weekday", n), `wd-${u}`)}
              {money("Harga weekend (Jum–Sab)", price.weekend, (n) => setP("weekend", n), `we-${u}`)}
              {number("Minimal malam", price.minNights, (n) => setP("minNights", n), `mn-${u}`, 30)}
            </div>
            <Toggle
              checked={price.bookable}
              onChange={(v) => setP("bookable", v)}
              label="Bisa dipesan online"
              hint={price.bookable ? "Tampil dan bisa dibayar di website" : "Tamu diarahkan ke WhatsApp"}
            />

            <div className="ad-seasons">
              <div className="ad-seasons-head">
                <p className="ad-subtitle">Harga musim / tanggal khusus</p>
                <button
                  type="button"
                  className="ad-btn ad-btn--ghost ad-btn--sm"
                  onClick={() => setP("seasons", [...price.seasons, { id: uid(), name: "", from: today, to: addDays(today, 7), rate: price.weekend }])}
                >
                  <Plus size={14} strokeWidth={1.8} aria-hidden="true" />
                  Tambah
                </button>
              </div>
              {price.seasons.length ? (
                <ul className="ad-season-list">
                  {price.seasons.map((s, i) => {
                    const patch = (p: Partial<typeof s>) => setP("seasons", price.seasons.map((x, j) => (j === i ? { ...x, ...p } : x)));
                    return (
                      <li key={s.id}>
                        <div className="sv-input">
                          <label htmlFor={`sn-${s.id}`}>Nama</label>
                          <input id={`sn-${s.id}`} value={s.name} onChange={(e) => patch({ name: e.target.value })} placeholder="Misal: Libur Lebaran" />
                        </div>
                        <div className="sv-input">
                          <label htmlFor={`sf-${s.id}`}>Dari</label>
                          <input id={`sf-${s.id}`} type="date" value={s.from} onChange={(e) => patch({ from: e.target.value })} />
                        </div>
                        <div className="sv-input">
                          <label htmlFor={`st-${s.id}`}>Sampai</label>
                          <input id={`st-${s.id}`} type="date" value={s.to} min={addDays(s.from, 1)} onChange={(e) => patch({ to: e.target.value })} />
                        </div>
                        {money("Harga / malam", s.rate, (n) => patch({ rate: n }), `sr-${s.id}`)}
                        <button type="button" className="ad-icon-btn" onClick={() => setP("seasons", price.seasons.filter((_, j) => j !== i))} aria-label={`Hapus ${s.name || "musim"}`}>
                          <Trash2 size={16} strokeWidth={1.6} aria-hidden="true" />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              ) : (
                <p className="ad-muted">Belum ada. Harga weekday dan weekend berlaku sepanjang tahun.</p>
              )}
            </div>
            <p className="ad-muted ad-preview-price">
              Contoh di website: 2 malam Jumat–Minggu = <strong className="tnum">{idr(price.weekend * 2)}</strong>
            </p>
          </section>

          <SaveBar
            dirty={dirty}
            saving={saving}
            saved={saved}
            onReset={() => {
              setDraft(room);
              setPrice(rate);
            }}
            onSave={async () => {
              if (!draft.name.trim()) return toast("Nama kamar tidak boleh kosong");
              if (price.bookable && (!price.weekday || !price.weekend)) return toast("Isi harga weekday dan weekend dulu sebelum dijual online");
              setSaving(true);
              await saveRoom({ ...draft, name: draft.name.trim() });
              await saveRate(price);
              setSaving(false);
              setSaved(true);
              toast(`${draft.name} disimpan`);
            }}
          />

          <div className="ad-danger-zone">
            <div>
              <p className="ad-subtitle">Hapus kamar ini</p>
              <p className="ad-muted">Kamar hilang dari website, booking, dan kalender. Riwayat booking lamanya tetap tersimpan.</p>
            </div>
            <button type="button" className="ad-btn ad-btn--danger" onClick={() => setRemoving(true)}>
              <Trash2 size={14} strokeWidth={1.7} aria-hidden="true" />
              Hapus kamar
            </button>
          </div>
        </div>
      ) : null}

      <Dialog
        open={removing}
        onClose={() => {
          setRemoving(false);
          setBlockedBy(null);
        }}
        title={`Hapus ${room.name}?`}
        footer={
          blockedBy ? (
            <button type="button" className="ad-btn ad-btn--ghost" onClick={() => setRemoving(false)}>
              Tutup
            </button>
          ) : (
            <>
              <button type="button" className="ad-btn ad-btn--ghost" onClick={() => setRemoving(false)}>
                Batal
              </button>
              <button
                type="button"
                className="ad-btn ad-btn--danger"
                onClick={async () => {
                  const res = await archiveRoom(room.unit);
                  if (!res.ok) return setBlockedBy(res.codes);
                  setRemoving(false);
                  toast(`${room.name} dihapus`);
                }}
              >
                Hapus
              </button>
            </>
          )
        }
      >
        {blockedBy ? (
          <p className="ad-muted">
            Belum bisa dihapus: masih ada tamu yang akan datang di kamar ini (
            {blockedBy.map((code, i) => (
              <span key={code}>
                {i ? ", " : ""}
                <Link href={`/admin/bookings/${code}`} className="ad-link">
                  {code}
                </Link>
              </span>
            ))}
            ). Selesaikan atau batalkan booking itu dulu.
          </p>
        ) : (
          <p className="ad-muted">Kamar tidak bisa dipesan lagi dan hilang dari daftar. Booking yang sudah lewat tetap menyebut kamar ini.</p>
        )}
      </Dialog>
    </Card>
  );
}
