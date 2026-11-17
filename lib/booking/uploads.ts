"use client";

/**
 * Photographs uploaded in the admin. The file goes to the server
 * (POST /api/admin/uploads), which shrinks it to 1800px, stores it on its own
 * disk (lib/server/storage.ts) and answers with its address,
 * /uploads/<year>/<id>.jpg. That address is what rooms and content keep.
 */

const PREFIX = "/uploads/";

/** Same limit as the server: phone photographs are well under it. */
const MAX_BYTES = 20 * 1024 * 1024;

/** A photograph uploaded in the admin, rather than one that ships with the site. */
export const isUpload = (src: string) => src.startsWith(PREFIX);

export type UploadError = "not_image" | "too_large" | "unreadable" | "storage";

export async function putUpload(file: File): Promise<{ ok: true; src: string; name: string } | { ok: false; error: UploadError; name: string }> {
  const name = file.name;
  if (!file.type.startsWith("image/")) return { ok: false, error: "not_image", name };
  if (file.size > MAX_BYTES) return { ok: false, error: "too_large", name };
  const body = new FormData();
  body.append("file", file, name);
  try {
    const res = await fetch("/api/admin/uploads", { method: "POST", body });
    const data = (await res.json()) as { ok: true; src: string; name: string } | { ok: false; error: UploadError; name: string };
    return data.ok ? data : { ok: false, error: data.error ?? "storage", name };
  } catch {
    return { ok: false, error: "storage", name };
  }
}
