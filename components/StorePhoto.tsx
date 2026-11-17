import Image from "next/image";
import { isUpload } from "@/lib/booking/uploads";

/**
 * One photograph, wherever it lives: a file that ships with the site (through
 * next/image, optimised) or one uploaded in the admin (/uploads/..., already
 * shrunk to 1800px JPEG on the server, so it is drawn as it is).
 *
 * Fills its positioned parent, like `next/image fill`.
 */
export default function StorePhoto({ src, alt, sizes }: { src: string; alt: string; sizes: string }) {
  if (!isUpload(src)) return <Image src={src} alt={alt} fill sizes={sizes} className="sv-photo" />;
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={src} alt={alt} loading="lazy" decoding="async" className="sv-photo sv-upload-img" />;
}
