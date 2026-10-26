"use client";

import { useRef, useState, type DragEvent } from "react";
import { ArrowLeft, ArrowRight, ImagePlus, LoaderCircle, Star, Trash2, Upload, X } from "lucide-react";
import { photos as library } from "@/content/site";
import StorePhoto from "../StorePhoto";
import { Dialog, toast } from "./ui";
import { saveMedia } from "@/lib/booking/api";
import { useMediaMeta } from "@/lib/booking/hooks";
import { isUpload, putUpload, type UploadError } from "@/lib/booking/uploads";

/**
 * The photographs of one room or one content item: upload, pick from what the
 * site already has, put in order, describe, remove.
 *
 *  - Upload by dropping files on the zone or choosing them. Each picture is
 *    shrunk to a web size before it is stored, so a 12 MB phone photo does not
 *    become a 12 MB page.
 *  - The first photograph is the cover; the arrows and "Jadikan sampul" move
 *    it.
 *  - Clicking a photograph opens its details, where an uploaded one gets its
 *    description in both languages. That text is what a screen reader says in
 *    place of the picture, so the dialog asks for it rather than hiding it.
 *
 * The list is the parent's draft: nothing here is saved until the page's own
 * Simpan. The files themselves are stored at once (BOOKING.md, "Uploads").
 */

const LIBRARY = Object.values(library).flat();
const libraryAlt = (src: string) => LIBRARY.find((p) => p.src === src)?.alt;

const ERRORS: Record<UploadError, string> = {
  not_image: "bukan file gambar",
  too_large: "lebih dari 20 MB",
  unreadable: "formatnya tidak bisa dibaca browser (misal HEIC). Simpan sebagai JPG dulu",
  storage: "penyimpanan browser penuh",
};

export default function PhotoManager({
  photos,
  onChange,
  emptyHint = "Belum ada foto.",
}: {
  photos: string[];
  onChange: (next: string[]) => void;
  emptyHint?: string;
}) {
  const media = useMediaMeta();
  const input = useRef<HTMLInputElement>(null);
  const [over, setOver] = useState(false);
  const [busy, setBusy] = useState(0);
  const [problems, setProblems] = useState<string[]>([]);
  const [picker, setPicker] = useState(false);
  const [detail, setDetail] = useState<string | null>(null);
  const [alt, setAlt] = useState({ id: "", en: "" });

  const altFor = (src: string) => (isUpload(src) ? media[src]?.alt.id || media[src]?.name || "Foto unggahan" : (libraryAlt(src)?.id ?? ""));

  const upload = async (files: File[]) => {
    if (!files.length) return;
    setProblems([]);
    setBusy(files.length);
    const next = [...photos];
    const failed: string[] = [];
    for (const file of files) {
      const res = await putUpload(file);
      if (res.ok) {
        next.push(res.src);
        await saveMedia(res.src, { name: res.name, alt: { id: "", en: "" } });
      } else {
        failed.push(`${res.name}: ${ERRORS[res.error]}`);
      }
      setBusy((n) => Math.max(0, n - 1));
    }
    setBusy(0);
    const added = next.length - photos.length;
    if (added) {
      onChange(next);
      toast(`${added} foto diunggah. Tekan Simpan untuk memakainya.`);
    }
    setProblems(failed);
  };

  const onDrop = (e: DragEvent) => {
    e.preventDefault();
    setOver(false);
    void upload([...e.dataTransfer.files]);
  };

  const move = (from: number, to: number) => {
    if (to < 0 || to >= photos.length) return;
    const next = [...photos];
    const [item] = next.splice(from, 1);
    next.splice(to, 0, item);
    onChange(next);
  };

  const openDetail = (src: string) => {
    setAlt(isUpload(src) ? (media[src]?.alt ?? { id: "", en: "" }) : (libraryAlt(src) ?? { id: "", en: "" }));
    setDetail(src);
  };

  const detailIndex = detail ? photos.indexOf(detail) : -1;

  return (
    <div className="ad-pm">
      <div className="ad-photos-head">
        <p className="ad-subtitle">Foto ({photos.length})</p>
        <button type="button" className="ad-btn ad-btn--ghost ad-btn--sm" onClick={() => setPicker(true)}>
          <ImagePlus size={14} strokeWidth={1.6} aria-hidden="true" />
          Dari galeri situs
        </button>
      </div>

      <div
        className="ad-drop"
        data-over={over ? "true" : undefined}
        onDragOver={(e) => {
          e.preventDefault();
          setOver(true);
        }}
        onDragLeave={() => setOver(false)}
        onDrop={onDrop}
      >
        <input
          ref={input}
          type="file"
          accept="image/*"
          multiple
          className="sr-only"
          tabIndex={-1}
          onChange={(e) => {
            void upload([...(e.target.files ?? [])]);
            e.target.value = "";
          }}
        />
        {busy ? (
          <p className="ad-drop-text" role="status">
            <LoaderCircle className="sv-spin" size={16} strokeWidth={1.8} aria-hidden="true" />
            Mengunggah {busy} foto
          </p>
        ) : (
          <>
            <p className="ad-drop-text">
              <Upload size={16} strokeWidth={1.6} aria-hidden="true" />
              Tarik foto ke sini
            </p>
            <button type="button" className="ad-btn ad-btn--primary ad-btn--sm" onClick={() => input.current?.click()}>
              Pilih dari perangkat
            </button>
            <p className="ad-hint">JPG, PNG, atau WebP. Otomatis diperkecil ke ukuran web.</p>
          </>
        )}
      </div>

      {problems.length ? (
        <ul className="ad-problems" role="alert">
          {problems.map((p) => (
            <li key={p}>{p}</li>
          ))}
        </ul>
      ) : null}

      {photos.length ? (
        <ul className="ad-photos">
          {photos.map((src, i) => (
            <li key={src}>
              <button type="button" className="ad-photo ad-photo--btn" onClick={() => openDetail(src)} aria-label={`Detail foto ${i + 1}: ${altFor(src)}`}>
                <StorePhoto src={src} alt="" sizes="180px" />
                {i === 0 ? <span className="ad-photo-cover">Sampul</span> : null}
                {isUpload(src) && !media[src]?.alt.id ? <span className="ad-photo-flag">Belum ada deskripsi</span> : null}
              </button>
              <span className="ad-photo-tools">
                <button type="button" className="ad-icon-btn" onClick={() => move(i, i - 1)} disabled={i === 0} aria-label="Geser ke kiri">
                  <ArrowLeft size={15} strokeWidth={1.6} aria-hidden="true" />
                </button>
                <button type="button" className="ad-icon-btn" onClick={() => move(i, i + 1)} disabled={i === photos.length - 1} aria-label="Geser ke kanan">
                  <ArrowRight size={15} strokeWidth={1.6} aria-hidden="true" />
                </button>
                <button type="button" className="ad-icon-btn" onClick={() => onChange(photos.filter((p) => p !== src))} aria-label="Hapus foto">
                  <X size={15} strokeWidth={1.6} aria-hidden="true" />
                </button>
              </span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="ad-muted">{emptyHint}</p>
      )}

      {/* --- One photograph ---------------------------------------------- */}
      <Dialog
        open={!!detail}
        onClose={() => setDetail(null)}
        title="Detail foto"
        wide
        footer={
          detail ? (
            <>
              <button
                type="button"
                className="ad-btn ad-btn--danger"
                onClick={() => {
                  onChange(photos.filter((p) => p !== detail));
                  setDetail(null);
                }}
              >
                <Trash2 size={14} strokeWidth={1.7} aria-hidden="true" />
                Hapus dari sini
              </button>
              {detailIndex > 0 ? (
                <button
                  type="button"
                  className="ad-btn ad-btn--ghost"
                  onClick={() => {
                    move(detailIndex, 0);
                    setDetail(null);
                  }}
                >
                  <Star size={14} strokeWidth={1.7} aria-hidden="true" />
                  Jadikan sampul
                </button>
              ) : null}
              {isUpload(detail) ? (
                <button
                  type="button"
                  className="ad-btn ad-btn--primary"
                  onClick={async () => {
                    await saveMedia(detail, { name: media[detail]?.name ?? "", alt });
                    toast("Deskripsi foto disimpan");
                    setDetail(null);
                  }}
                >
                  Simpan deskripsi
                </button>
              ) : (
                <button type="button" className="ad-btn ad-btn--primary" onClick={() => setDetail(null)}>
                  Selesai
                </button>
              )}
            </>
          ) : null
        }
      >
        {detail ? (
          <div className="ad-photo-detail">
            <span className="ad-photo ad-photo--large">
              <StorePhoto src={detail} alt={altFor(detail)} sizes="(min-width: 800px) 420px, 90vw" />
            </span>
            <div className="ad-stack-sm">
              {isUpload(detail) ? (
                <>
                  <p className="ad-muted">
                    Tulis apa yang terlihat di foto. Teks ini dibacakan untuk pengunjung yang tidak bisa melihat gambar, dan
                    membantu mesin pencari.
                  </p>
                  <div className="sv-input">
                    <label htmlFor="pm-alt-id">Deskripsi · Indonesia</label>
                    <input id="pm-alt-id" value={alt.id} onChange={(e) => setAlt((a) => ({ ...a, id: e.target.value }))} placeholder="Misal: Kolam renang dengan kabin di sekelilingnya" />
                  </div>
                  <div className="sv-input">
                    <label htmlFor="pm-alt-en">Deskripsi · English</label>
                    <input id="pm-alt-en" value={alt.en} onChange={(e) => setAlt((a) => ({ ...a, en: e.target.value }))} placeholder="e.g. The swimming pool with cabins around it" />
                  </div>
                  {media[detail]?.name ? <p className="ad-hint">File: {media[detail].name}</p> : null}
                </>
              ) : (
                <dl className="ad-dl ad-dl--one">
                  <div>
                    <dt>Deskripsi · Indonesia</dt>
                    <dd>{alt.id}</dd>
                  </div>
                  <div>
                    <dt>Deskripsi · English</dt>
                    <dd>{alt.en}</dd>
                  </div>
                  <div>
                    <dt>Sumber</dt>
                    <dd>Foto bawaan situs</dd>
                  </div>
                </dl>
              )}
            </div>
          </div>
        ) : null}
      </Dialog>

      {/* --- Pick from the site's own photographs -------------------------- */}
      <Dialog open={picker} onClose={() => setPicker(false)} title="Pilih dari galeri situs" wide>
        <ul className="ad-picker">
          {LIBRARY.map((p) => {
            const used = photos.includes(p.src);
            return (
              <li key={p.src}>
                <button
                  type="button"
                  className="ad-picker-item"
                  data-used={used ? "true" : undefined}
                  disabled={used}
                  onClick={() => {
                    onChange([...photos, p.src]);
                    toast("Foto ditambahkan");
                  }}
                >
                  <span className="ad-photo">
                    <StorePhoto src={p.src} alt="" sizes="140px" />
                  </span>
                  <small>{used ? "Sudah dipakai" : p.alt.id}</small>
                </button>
              </li>
            );
          })}
        </ul>
      </Dialog>
    </div>
  );
}
