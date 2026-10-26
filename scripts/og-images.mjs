/**
 * Crops the share photographs to 1200×630, the size link previews expect
 * (WhatsApp, Facebook, X, LinkedIn).
 *
 * The list is `share` in content/site.ts: one photograph of the property per
 * page. Each becomes public/og/<key>.jpg, which lib/seo.ts points og:image at.
 * Run it again whenever an entry in `share` changes:
 *
 *   node scripts/og-images.mjs
 *
 * Needs Node 23.6 or newer, which reads the TypeScript facts file as it is.
 * `sharp` is the copy that ships with Next.
 */
import { mkdir } from "node:fs/promises";
import sharp from "sharp";
import { share } from "../content/site.ts";

await mkdir("public/og", { recursive: true });

for (const [key, photo] of Object.entries(share)) {
  const out = `public/og/${key}.jpg`;
  const { size } = await sharp(`public${photo.src}`)
    .resize(1200, 630, { fit: "cover", position: "centre" })
    .jpeg({ quality: 80, mozjpeg: true })
    .toFile(out);
  console.log(`${out}  ${Math.round(size / 1024)} KB  from ${photo.src}`);
}
