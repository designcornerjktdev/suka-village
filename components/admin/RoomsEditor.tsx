"use client";

import { useState } from "react";
import Link from "next/link";
import { ImageOff, Info, Plus, Trash2 } from "lucide-react";
import type { Feature } from "@/content/site";
import { dict } from "@/content/dict";
import StorePhoto from "../StorePhoto";
import PhotoManager from "./PhotoManager";
import { Badge, ConfirmDelete, Dialog, Empty, PageHeader, RowActions, Sheet, SheetFooter, Toggle, toast } from "./ui";
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
 * The website's prices come only from here. The rooms are a list; a room is
 * edited in a panel and saved on its own, so a half edited villa never
 * blocks saving a cabin.
 *
 * Rooms can be added and removed. A new room starts off sale; a removed room
 * is archived, not erased, and only once no upcoming booking holds it.
 */

const FEATURES = Object.keys(dict.id.rooms.features) as Feature[];

export default function RoomsEditor() {
  const rooms = useRooms();
  const rates = useRates();
  const [editing, setEditing] = useState<{ unit: string; n: number } | null>(null);
  const [adding, setAdding] = useState(false);
  const [newName, setNewName] = useState("");
  const [removing, setRemoving] = useState<Room | null>(null);
  const [blockedBy, setBlockedBy] = useState<{ room: Room; codes: string[] } | null>(null);

  const open = (unit: string) => setEditing((e) => ({ unit, n: (e?.n ?? 0) + 1 }));
  const add = async () => {
    const room = await createRoom(newName);
    setAdding(false);
    setNewName("");
    open(room.unit);
    toast(`${room.name} ditambahkan. Lengkapi lalu nyalakan "Bisa dipesan online".`);
  };
  const editingRoom = editing ? rooms.find((r) => r.unit === editing.unit) : undefined;
  const editingRate = editing ? rates.find((r) => r.unit === editing.unit) : undefined;

  const addButton = (
    <button type="button" className="ad-btn ad-btn--primary" onClick={() => setAdding(true)}>
      <Plus size={16} strokeWidth={1.8} aria-hidden="true" />
      Tambah kamar
    </button>
  );

  return (
    <>
      <PageHeader title="Kamar & harga" lead="Nama, ukuran, fasilitas, deskripsi, foto, dan harga tiap kamar." actions={addButton} />
      {DEMO ? (
        <p className="ad-note ad-note--warn">
          <Info size={15} strokeWidth={1.6} aria-hidden="true" />
          Harga di bawah masih contoh untuk prototipe. Isi dengan harga asli sebelum situs dibuka untuk umum.
        </p>
      ) : null}

      {rooms.length ? (
        <ol className="ad-records">
          {rooms.map((room) => {
            const rate = rates.find((r) => r.unit === room.unit);
            const from = rate && rate.weekday && rate.weekend ? Math.min(rate.weekday, rate.weekend) : 0;
            return (
              <li key={room.unit} className="ad-record">
                <button type="button" className="ad-record-main" onClick={() => open(room.unit)}>
                  <span className="ad-record-thumb">
                    {room.photos[0] ? <StorePhoto src={room.photos[0]} alt="" sizes="72px" /> : <ImageOff size={18} strokeWidth={1.4} aria-hidden="true" />}
                  </span>
                  <span className="ad-record-text">
                    <strong>{room.name || "(tanpa nama)"}</strong>
                    <small className="tnum">
                      {room.size} m² · {room.bedrooms} kamar tidur · {from ? `mulai ${idr(from)} / malam` : "harga belum diisi"}
                    </small>
                  </span>
                </button>
                <span className="ad-record-state">
                  <Badge tone={rate?.bookable ? "ok" : "off"}>{rate?.bookable ? "Dijual online" : "Tidak dijual online"}</Badge>
                </span>
                <RowActions label={room.name} onEdit={() => open(room.unit)} onDelete={() => setRemoving(room)} />
              </li>
            );
          })}
        </ol>
      ) : (
        <Empty action={addButton}>Belum ada kamar.</Empty>
      )}

      {editing && editingRoom && editingRate ? <RoomSheet key={editing.n} room={editingRoom} rate={editingRate} onClose={() => setEditing(null)} /> : null}

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
              Lanjut isi detail
            </button>
          </>
        }
      >
        <p className="ad-muted">Kamar baru belum dijual online. Setelah ini, isi ukuran, foto, dan harganya, lalu nyalakan &quot;Bisa dipesan online&quot;.</p>
        <div className="sv-input">
          <label htmlFor="new-room">Nama kamar</label>
          <input
            id="new-room"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && newName.trim()) add();
            }}
            placeholder="Misal: Garden Cabin"
            autoComplete="off"
          />
        </div>
      </Dialog>

      <ConfirmDelete
        open={!!removing}
        title={`Hapus ${removing?.name ?? "kamar"}?`}
        onCancel={() => setRemoving(null)}
        onConfirm={async () => {
          if (!removing) return;
          const res = await archiveRoom(removing.unit);
          if (!res.ok) setBlockedBy({ room: removing, codes: res.codes });
          else toast(`${removing.name} dihapus`);
          setRemoving(null);
        }}
      >
        Kamar tidak bisa dipesan lagi dan hilang dari website, booking, dan kalender. Booking yang sudah lewat tetap menyebut kamar ini.
      </ConfirmDelete>

      <Dialog
        open={!!blockedBy}
        onClose={() => setBlockedBy(null)}
        title={`${blockedBy?.room.name ?? "Kamar"} belum bisa dihapus`}
        footer={
          <button type="button" className="ad-btn ad-btn--ghost" onClick={() => setBlockedBy(null)}>
            Tutup
          </button>
        }
      >
        <p className="ad-muted">
          Masih ada tamu yang akan datang di kamar ini (
          {blockedBy?.codes.map((code, i) => (
            <span key={code}>
              {i ? ", " : ""}
              <Link href={`/admin/bookings/${code}`} className="ad-link">
                {code}
              </Link>
            </span>
          ))}
          ). Selesaikan atau batalkan booking itu dulu. Untuk berhenti menjual sementara, matikan &quot;Bisa dipesan online&quot;.
        </p>
      </Dialog>
    </>
  );
}

function RoomSheet({ room, rate, onClose }: { room: Room; rate: UnitRate; onClose: () => void }) {
  const [draft, setDraft] = useState<Room>(room);
  const [price, setPrice] = useState<UnitRate>(rate);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const today = todayISO();
  const u = room.unit;

  const set = <K extends keyof Room>(k: K, v: Room[K]) => {
    setError(null);
    setDraft((d) => ({ ...d, [k]: v }));
  };
  const setP = <K extends keyof UnitRate>(k: K, v: UnitRate[K]) => {
    setError(null);
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

  const save = async () => {
    if (!draft.name.trim()) return setError("Nama kamar tidak boleh kosong.");
    if (price.bookable && (!price.weekday || !price.weekend)) return setError("Isi harga weekday dan weekend dulu sebelum dijual online.");
    if (price.seasons.some((x) => x.to <= x.from)) return setError("Tanggal akhir harga musim harus setelah tanggal mulai.");
    setSaving(true);
    await saveRoom({ ...draft, name: draft.name.trim() });
    await saveRate(price);
    setSaving(false);
    toast(`${draft.name.trim()} disimpan`);
    onClose();
  };

  return (
    <Sheet
      open
      onClose={onClose}
      title={`Ubah ${room.name || "kamar"}`}
      lead="Info, foto, dan harga kamar ini."
      footer={<SheetFooter busy={saving} onCancel={onClose} onSave={save} />}
    >
      {/* --- What it is ---------------------------------------------- */}
      <section className="ad-form-sec">
        <h3>Info kamar</h3>
        <div className="ad-grid-2">
          <div className="sv-input ad-span-all">
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

        <div className="ad-bilingual ad-bilingual--stack">
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
      <section className="ad-form-sec">
        <h3>Foto</h3>
        <p className="ad-hint">Tiga foto pertama tampil di slider halaman Kamar; semua foto tampil di slider besar halaman kamar ini. Foto pertama jadi sampul.</p>
        <PhotoManager photos={draft.photos} onChange={(next) => set("photos", next)} emptyHint="Belum ada foto untuk kamar ini." />
      </section>

      {/* --- Price and rules ----------------------------------------- */}
      <section className="ad-form-sec">
        <h3>Harga & aturan pemesanan</h3>
        <div className="ad-grid-2">
          {money("Harga weekday (Min–Kam)", price.weekday, (n) => setP("weekday", n), `wd-${u}`)}
          {money("Harga weekend (Jum–Sab)", price.weekend, (n) => setP("weekend", n), `we-${u}`)}
          {number("Minimal malam", price.minNights, (n) => setP("minNights", n), `mn-${u}`, 30)}
        </div>
        <p className="ad-hint">Isi harga per malam yang sudah termasuk pajak. Di website, setiap harga dan total diberi keterangan Termasuk pajak.</p>
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

      {error ? (
        <p className="sv-bk-alert" role="alert">
          {error}
        </p>
      ) : null}
    </Sheet>
  );
}
