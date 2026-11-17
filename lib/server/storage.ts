import { randomBytes } from "node:crypto";
import { mkdir, readFile, unlink, writeFile } from "node:fs/promises";
import { isAbsolute, join, relative, resolve } from "node:path";
import sharp from "sharp";

/**
 * Photographs uploaded in the admin, on the server's own disk (decided for
 * Hostinger or a VPS; a host without a lasting disk, such as Vercel, needs an
 * object-storage version of these three functions).
 *
 * Every upload is shrunk to 1800px on its long side and re-encoded as JPEG,
 * like the site's own photographs. Files live under UPLOAD_DIR (outside the
 * app build, so a deploy never wipes them; back it up with the database) and
 * are served at /uploads/<year>/<id>.jpg.
 */

export const MAX_UPLOAD_BYTES = 20 * 1024 * 1024;
const MAX_SIDE = 1800;

export type UploadError = "not_image" | "too_large" | "unreadable" | "storage";
export type UploadResult = { ok: true; src: string; name: string } | { ok: false; error: UploadError; name: string };

/* turbopackIgnore: the folder is chosen at run time (UPLOAD_DIR), so the
   build must not trace the project from it. */
const root = () => resolve(/*turbopackIgnore: true*/ process.env.UPLOAD_DIR || "./uploads");

/** The absolute path for a path under /uploads, or null if it would leave the folder. */
function inside(rel: string): string | null {
  const base = root();
  const full = resolve(/*turbopackIgnore: true*/ base, rel);
  const back = relative(base, full);
  if (!back || back.startsWith("..") || isAbsolute(back)) return null;
  return full;
}

export async function putUpload(data: Buffer, name: string): Promise<UploadResult> {
  if (data.length > MAX_UPLOAD_BYTES) return { ok: false, error: "too_large", name };
  let jpeg: Buffer;
  try {
    jpeg = await sharp(data)
      .rotate() /* honour the camera's orientation, then drop the EXIF (and its location) */
      .resize({ width: MAX_SIDE, height: MAX_SIDE, fit: "inside", withoutEnlargement: true })
      .jpeg({ quality: 82, mozjpeg: true })
      .toBuffer();
  } catch {
    /* Not a picture sharp can read (or a damaged one). */
    return { ok: false, error: "unreadable", name };
  }
  const year = String(new Date().getUTCFullYear());
  const id = `${Date.now().toString(36)}${randomBytes(4).toString("hex")}`;
  try {
    await mkdir(join(/*turbopackIgnore: true*/ root(), year), { recursive: true });
    await writeFile(join(/*turbopackIgnore: true*/ root(), year, `${id}.jpg`), jpeg);
  } catch (e) {
    console.error("[uploads] write failed:", e);
    return { ok: false, error: "storage", name };
  }
  return { ok: true, src: `/uploads/${year}/${id}.jpg`, name };
}

/** The file at `rel` (the part after /uploads/), or null. */
export async function readUpload(rel: string): Promise<Buffer | null> {
  const full = inside(rel);
  if (!full) return null;
  try {
    return await readFile(/*turbopackIgnore: true*/ full);
  } catch {
    return null;
  }
}

export async function removeUpload(src: string) {
  const full = src.startsWith("/uploads/") ? inside(src.slice("/uploads/".length)) : null;
  if (full) await unlink(/*turbopackIgnore: true*/ full).catch(() => undefined);
}
