"use client";

/**
 * PROTOTYPE file storage for photographs uploaded in the admin.
 *
 * The files live in IndexedDB in this browser, shrunk to a web size first, and
 * are referenced everywhere else as the string "upload:<id>". localStorage
 * could not hold them: a handful of photographs would fill its quota.
 *
 * In production this whole file becomes one call: POST the file to object
 * storage (S3, R2, Supabase Storage) behind the admin API and store the URL it
 * returns. `putUpload` keeps its signature; `getUploadUrl` goes away because
 * the reference is then a real URL.
 */

const DB_NAME = "sv-demo-uploads";
const STORE = "files";
const PREFIX = "upload:";

/** Largest side after shrinking. Enough for a full width slide. */
const MAX_SIDE = 1800;
const MAX_BYTES = 20 * 1024 * 1024;

export const isUpload = (src: string) => src.startsWith(PREFIX);

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, 1);
    req.onupgradeneeded = () => req.result.createObjectStore(STORE);
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

async function tx<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  return new Promise((resolve, reject) => {
    const req = run(db.transaction(STORE, mode).objectStore(STORE));
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export type UploadError = "not_image" | "too_large" | "unreadable" | "storage";

/** Shrinks the picture to web size and re-encodes it as JPEG. */
async function shrink(file: File): Promise<Blob> {
  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(bitmap.width * scale);
  canvas.height = Math.round(bitmap.height * scale);
  canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close();
  return new Promise((resolve, reject) =>
    canvas.toBlob((blob) => (blob ? resolve(blob) : reject(new Error("encode"))), "image/jpeg", 0.82),
  );
}

export async function putUpload(file: File): Promise<{ ok: true; src: string; name: string } | { ok: false; error: UploadError; name: string }> {
  const name = file.name;
  if (!file.type.startsWith("image/")) return { ok: false, error: "not_image", name };
  if (file.size > MAX_BYTES) return { ok: false, error: "too_large", name };
  let blob: Blob;
  try {
    blob = await shrink(file);
  } catch {
    /* A format the browser cannot decode (HEIC on most browsers, a damaged file). */
    return { ok: false, error: "unreadable", name };
  }
  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
  try {
    await tx("readwrite", (s) => s.put(blob, id));
  } catch {
    return { ok: false, error: "storage", name };
  }
  return { ok: true, src: `${PREFIX}${id}`, name };
}

const urls = new Map<string, string>();

/** An object URL for an uploaded photograph, or null if it is gone. */
export async function getUploadUrl(src: string): Promise<string | null> {
  const hit = urls.get(src);
  if (hit) return hit;
  try {
    const blob = await tx<Blob | undefined>("readonly", (s) => s.get(src.slice(PREFIX.length)));
    if (!blob) return null;
    const url = URL.createObjectURL(blob);
    urls.set(src, url);
    return url;
  } catch {
    return null;
  }
}
