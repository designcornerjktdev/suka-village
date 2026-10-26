"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpRight, ChevronDown, Info, Plus, Trash2 } from "lucide-react";
import StorePhoto from "../StorePhoto";
import PhotoManager from "./PhotoManager";
import { Card, Dialog, PageHeader, SaveBar, Toggle, toast } from "./ui";
import { useContent } from "@/lib/booking/hooks";
import { saveContent } from "@/lib/booking/api";
import { DEMO } from "@/lib/booking/config";
import { uid } from "@/lib/booking/format";
import type { ContentItem, ContentSection } from "@/lib/booking/types";

/**
 * The CMS: one tab per page of the public site, holding exactly what that
 * page shows, in both languages side by side, so a change in one language is
 * never made without seeing the other. Nothing is final until Simpan.
 *
 * Three shapes, as the pages are built:
 *   photos   Beranda (one photograph) and Galeri (photographs only, in order)
 *   list     Fasilitas, Pengalaman, Acara, Jelajah: rows of title, text and
 *            photographs that can be added, removed, hidden and put in order;
 *            Jelajah also has its map link and photo credits
 *   contact  Kontak: its two fixed rows, Reservasi and Lokasi
 *
 * Rooms are not here: a room's text and photographs live with its facts and
 * its price, under Kamar & harga. The WhatsApp number is under Pengaturan.
 */

type Kind = "photos" | "list" | "contact";

type Meta = { id: ContentSection; label: string; page: string; hint: string; kind: Kind; noun?: string; empty?: string };

const SECTIONS: Meta[] = [
  { id: "home", label: "Beranda", page: "", kind: "photos", hint: "Satu foto Main Villa di halaman utama, di bawah header. Yang tampil adalah foto pertama.", empty: "Belum ada foto. Halaman utama butuh satu foto." },
  { id: "facilities", label: "Fasilitas", page: "facilities", kind: "list", hint: "Kolam renang, restoran, ruang pertemuan, taman bermain, toko.", noun: "fasilitas" },
  { id: "experiences", label: "Pengalaman", page: "experience", kind: "list", hint: "Kegiatan untuk tamu yang menginap.", noun: "pengalaman" },
  { id: "events", label: "Acara", page: "event", kind: "list", hint: "Corporate dan family gathering.", noun: "acara" },
  { id: "explore", label: "Jelajah", page: "explore", kind: "list", hint: "Tempat menarik di sekitar Suka Village, masing-masing dengan link peta.", noun: "tempat" },
  { id: "gallery", label: "Galeri", page: "gallery", kind: "photos", hint: "Foto saja, tanpa keterangan. Urutan di sini sama dengan urutan di halaman Galeri.", empty: "Belum ada foto di galeri." },
  { id: "contact", label: "Kontak", page: "contact", kind: "contact", hint: "Dua baris di halaman Kontak: Reservasi dan Lokasi. Nomor WhatsApp diatur di Pengaturan, bagian Kontak." },
];

export default function ContentEditor() {
  const content = useContent();
  const [section, setSection] = useState<ContentSection>("home");
  const meta = SECTIONS.find((s) => s.id === section)!;

  /* What the tab counts: rows for a list, photographs for the gallery. */
  const count = (s: Meta) =>
    s.kind === "list" ? content[s.id].length : s.id === "gallery" ? (content.gallery[0]?.photos.length ?? 0) : null;

  return (
    <>
      <PageHeader title="Konten" lead="Teks dan foto di setiap halaman, dalam bahasa Indonesia dan Inggris. Untuk kamar, buka Kamar & harga." />
      {DEMO ? (
        <p className="ad-note">
          <Info size={15} strokeWidth={1.6} aria-hidden="true" />
          Prototipe: perubahan dan foto yang diunggah tersimpan di browser ini, tapi situs publik masih membaca konten dari kode.
          Developer menyambungkan situs ke database supaya perubahan langsung tampil setelah disimpan.
        </p>
      ) : null}

      <div className="ad-tabs" role="tablist" aria-label="Bagian situs">
        {SECTIONS.map((s) => (
          <button key={s.id} type="button" role="tab" aria-selected={section === s.id} className="ad-tab" onClick={() => setSection(s.id)}>
            {s.label}
            {count(s) === null ? null : <span className="tnum">{count(s)}</span>}
          </button>
        ))}
      </div>

      <div className="ad-section-head">
        <p className="ad-muted">{meta.hint}</p>
        <Link href={`/id${meta.page ? `/${meta.page}` : ""}`} target="_blank" className="ad-link">
          Lihat halaman <ArrowUpRight size={13} strokeWidth={1.6} aria-hidden="true" />
        </Link>
      </div>

      {meta.kind === "photos" ? (
        <PhotosEditor key={section} section={section} items={content[section]} meta={meta} />
      ) : meta.kind === "contact" ? (
        <ContactEditor key={section} items={content.contact} />
      ) : (
        <ListEditor key={section} section={section} items={content[section]} meta={meta} />
      )}
    </>
  );
}

/* --- Shared ----------------------------------------------------------------- */

function useDraft(items: ContentItem[]) {
  const [draft, setDraft] = useState(items);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const dirty = JSON.stringify(draft) !== JSON.stringify(items);
  const change = (update: (d: ContentItem[]) => ContentItem[]) => {
    setSaved(false);
    setDraft(update);
  };
  const patch = (id: string, p: Partial<ContentItem>) => change((d) => d.map((x) => (x.id === id ? { ...x, ...p } : x)));
  const save = async (section: ContentSection, message: string) => {
    setSaving(true);
    await saveContent(section, draft);
    setSaving(false);
    setSaved(true);
    toast(message);
  };
  return { draft, setDraft, dirty, saving, saved, change, patch, save };
}

function Bilingual({
  id,
  label,
  value,
  onChange,
  rows,
}: {
  id: string;
  label: string;
  value: { id: string; en: string };
  onChange: (next: { id: string; en: string }) => void;
  rows?: number;
}) {
  return (
    <>
      {(["id", "en"] as const).map((l) => (
        <div key={l} className="sv-input">
          <label htmlFor={`${id}-${l}`}>
            {label} · {l === "id" ? "Indonesia" : "English"}
          </label>
          {rows ? (
            <textarea id={`${id}-${l}`} rows={rows} value={value[l]} onChange={(e) => onChange({ ...value, [l]: e.target.value })} />
          ) : (
            <input id={`${id}-${l}`} value={value[l]} onChange={(e) => onChange({ ...value, [l]: e.target.value })} />
          )}
        </div>
      ))}
    </>
  );
}

function Field({ id, label, value, onChange, placeholder, type = "text" }: { id: string; label: string; value: string; onChange: (v: string) => void; placeholder?: string; type?: string }) {
  return (
    <div className="sv-input">
      <label htmlFor={id}>{label}</label>
      <input id={id} type={type} value={value} placeholder={placeholder} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

const NO_DASH = "Hindari tanda pisah panjang; pakai koma atau titik.";

/* --- Beranda, Galeri: photographs only ------------------------------------- */

function PhotosEditor({ section, items, meta }: { section: ContentSection; items: ContentItem[]; meta: Meta }) {
  const { draft, setDraft, dirty, saving, saved, patch, save } = useDraft(items);
  const item = draft[0];
  return (
    <>
      {item ? (
        <Card>
          <PhotoManager photos={item.photos} onChange={(next) => patch(item.id, { photos: next })} emptyHint={meta.empty} />
        </Card>
      ) : null}
      <SaveBar dirty={dirty} saving={saving} saved={saved} onReset={() => setDraft(items)} onSave={() => save(section, section === "home" ? "Foto beranda disimpan" : "Galeri disimpan")} />
    </>
  );
}

/* --- Kontak: Reservasi and Lokasi ------------------------------------------ */

function ContactEditor({ items }: { items: ContentItem[] }) {
  const { draft, setDraft, dirty, saving, saved, patch, save } = useDraft(items);
  const reserve = draft.find((x) => x.id === "reserve");
  const location = draft.find((x) => x.id === "location");

  return (
    <>
      <div className="ad-stack">
        {reserve ? (
          <Card title="Reservasi">
            <div className="ad-item-body ad-item-body--flat">
              <div className="ad-bilingual">
                <Bilingual id="c-rn" label="Judul" value={reserve.name} onChange={(v) => patch(reserve.id, { name: v })} />
                <Bilingual id="c-rb" label="Teks" rows={4} value={reserve.body} onChange={(v) => patch(reserve.id, { body: v })} />
              </div>
              <p className="ad-hint">{NO_DASH}</p>
              <Field id="c-ig" label="Link Instagram" type="url" value={reserve.link ?? ""} placeholder="https://www.instagram.com/…" onChange={(v) => patch(reserve.id, { link: v })} />
              <PhotoManager photos={reserve.photos} onChange={(next) => patch(reserve.id, { photos: next })} emptyHint="Belum ada foto. Yang tampil di samping Reservasi adalah foto pertama." />
            </div>
          </Card>
        ) : null}

        {location ? (
          <Card title="Lokasi">
            <div className="ad-item-body ad-item-body--flat">
              <div className="ad-bilingual">
                <Bilingual id="c-ln" label="Judul" value={location.name} onChange={(v) => patch(location.id, { name: v })} />
              </div>
              <div className="sv-input">
                <label htmlFor="c-addr">Alamat</label>
                <textarea id="c-addr" rows={2} value={location.body.id} onChange={(e) => patch(location.id, { body: { id: e.target.value, en: e.target.value } })} />
              </div>
              <div className="ad-grid-2">
                <Field id="c-plus" label="Plus code" value={location.plusCode ?? ""} placeholder="42C5+CV5" onChange={(v) => patch(location.id, { plusCode: v })} />
                <Field id="c-map" label="Link Google Maps (Petunjuk arah)" type="url" value={location.link ?? ""} onChange={(v) => patch(location.id, { link: v })} />
              </div>
              <p className="ad-hint">Peta di halaman Kontak dicari dari plus code ini.</p>
            </div>
          </Card>
        ) : null}
      </div>

      <SaveBar
        dirty={dirty}
        saving={saving}
        saved={saved}
        onReset={() => setDraft(items)}
        onSave={() => {
          if (draft.some((x) => !x.name.id.trim())) return toast("Isi judul (Indonesia) dulu");
          return save("contact", "Konten Kontak disimpan");
        }}
      />
    </>
  );
}

/* --- Fasilitas, Pengalaman, Acara, Jelajah: rows ----------------------------- */

function ListEditor({ section, items, meta }: { section: ContentSection; items: ContentItem[]; meta: Meta }) {
  const { draft, setDraft, dirty, saving, saved, change, patch, save } = useDraft(items);
  const [openId, setOpenId] = useState<string | null>(items[0]?.id ?? null);
  const [removing, setRemoving] = useState<ContentItem | null>(null);
  const place = section === "explore";

  const move = (index: number, by: number) =>
    change((d) => {
      const next = [...d];
      const [item] = next.splice(index, 1);
      next.splice(index + by, 0, item);
      return next;
    });
  const add = () => {
    const item: ContentItem = { id: uid(), name: { id: "", en: "" }, body: { id: "", en: "" }, photos: [], visible: true, ...(place ? { link: "", credit: "" } : {}) };
    change((d) => [...d, item]);
    setOpenId(item.id);
  };

  return (
    <>
      <div className="ad-list-tools">
        <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={add}>
          <Plus size={14} strokeWidth={1.8} aria-hidden="true" />
          Tambah {meta.noun}
        </button>
      </div>

      <div className="ad-stack">
        {draft.map((item, index) => {
          const open = openId === item.id;
          return (
            <Card key={item.id} className="ad-item" id={`item-${item.id}`}>
              <button type="button" className="ad-item-head" onClick={() => setOpenId(open ? null : item.id)} aria-expanded={open}>
                <span className="ad-item-thumb">
                  {item.photos[0] ? <StorePhoto src={item.photos[0]} alt="" sizes="56px" /> : <span aria-hidden="true">–</span>}
                </span>
                <span className="ad-item-title">
                  <strong>{item.name.id || "(tanpa judul)"}</strong>
                  <small>
                    {item.photos.length} foto · {item.visible ? "tampil" : "disembunyikan"}
                  </small>
                </span>
                <ChevronDown size={18} strokeWidth={1.6} aria-hidden="true" className="ad-item-chevron" data-open={open ? "true" : undefined} />
              </button>

              {open ? (
                <div className="ad-item-body">
                  <div className="ad-bilingual">
                    <Bilingual id={`n-${item.id}`} label="Judul" value={item.name} onChange={(v) => patch(item.id, { name: v })} />
                    <Bilingual id={`b-${item.id}`} label="Teks" rows={5} value={item.body} onChange={(v) => patch(item.id, { body: v })} />
                  </div>
                  <p className="ad-hint">{NO_DASH}</p>

                  {place ? (
                    <div className="ad-grid-2">
                      <Field id={`l-${item.id}`} label="Link Google Maps (Buka di peta)" type="url" value={item.link ?? ""} onChange={(v) => patch(item.id, { link: v })} />
                      <div className="sv-input">
                        <label htmlFor={`c-${item.id}`}>Kredit foto, satu baris per foto</label>
                        <textarea id={`c-${item.id}`} rows={2} value={item.credit ?? ""} placeholder="Nama, sumber, lisensi" onChange={(e) => patch(item.id, { credit: e.target.value })} />
                      </div>
                    </div>
                  ) : null}

                  <PhotoManager
                    photos={item.photos}
                    onChange={(next) => patch(item.id, { photos: next })}
                    emptyHint="Belum ada foto. Tambahkan setidaknya satu; di situs, foto tampil sebagai slider di samping teks."
                  />

                  <Toggle checked={item.visible} onChange={(v) => patch(item.id, { visible: v })} label="Tampilkan di situs" hint={item.visible ? "Terlihat oleh pengunjung" : "Disembunyikan dari pengunjung"} />

                  <div className="ad-item-tools">
                    <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => move(index, -1)} disabled={index === 0}>
                      <ArrowUp size={14} strokeWidth={1.8} aria-hidden="true" />
                      Naikkan
                    </button>
                    <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => move(index, 1)} disabled={index === draft.length - 1}>
                      <ArrowDown size={14} strokeWidth={1.8} aria-hidden="true" />
                      Turunkan
                    </button>
                    <button type="button" className="ad-btn ad-btn--danger ad-btn--sm" onClick={() => setRemoving(item)}>
                      <Trash2 size={14} strokeWidth={1.7} aria-hidden="true" />
                      Hapus
                    </button>
                  </div>
                </div>
              ) : null}
            </Card>
          );
        })}
      </div>

      {draft.length ? null : <p className="ad-empty">Belum ada {meta.noun}. Tambahkan dengan tombol di atas.</p>}

      <SaveBar
        dirty={dirty}
        saving={saving}
        saved={saved}
        onReset={() => setDraft(items)}
        onSave={() => {
          const untitled = draft.find((x) => !x.name.id.trim());
          if (untitled) {
            setOpenId(untitled.id);
            return toast("Isi judul (Indonesia) untuk setiap item dulu");
          }
          return save(section, `Konten ${meta.label} disimpan`);
        }}
      />

      <Dialog
        open={!!removing}
        onClose={() => setRemoving(null)}
        title={`Hapus ${removing?.name.id || meta.noun}?`}
        footer={
          <>
            <button type="button" className="ad-btn ad-btn--ghost" onClick={() => setRemoving(null)}>
              Batal
            </button>
            <button
              type="button"
              className="ad-btn ad-btn--danger"
              onClick={() => {
                if (removing) change((d) => d.filter((x) => x.id !== removing.id));
                setRemoving(null);
                toast("Dihapus dari daftar. Klik Simpan untuk menerapkan.");
              }}
            >
              Hapus
            </button>
          </>
        }
      >
        <p className="ad-muted">Item ini hilang dari halaman {meta.label} setelah disimpan. Kalau hanya ingin menyembunyikan sementara, matikan &quot;Tampilkan di situs&quot;.</p>
      </Dialog>
    </>
  );
}
