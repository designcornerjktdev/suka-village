"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import { ImageOff } from "lucide-react";
import { getUploadUrl, isUpload } from "@/lib/booking/uploads";

/**
 * One photograph, wherever it lives: a file that ships with the site (through
 * next/image, optimised) or one uploaded in the admin ("upload:<id>", read
 * back from the prototype's IndexedDB as an object URL).
 *
 * Fills its positioned parent, like `next/image fill`.
 */
export default function StorePhoto({ src, alt, sizes }: { src: string; alt: string; sizes: string }) {
  if (!isUpload(src)) return <Image src={src} alt={alt} fill sizes={sizes} className="sv-photo" />;
  return <Uploaded src={src} alt={alt} />;
}

function Uploaded({ src, alt }: { src: string; alt: string }) {
  const [url, setUrl] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    let live = true;
    getUploadUrl(src).then((u) => {
      if (live) setUrl(u);
    });
    return () => {
      live = false;
    };
  }, [src]);

  if (url === undefined) return <span className="sv-upload-pending" aria-hidden="true" />;
  if (url === null) {
    return (
      <span className="sv-upload-missing" role="img" aria-label={alt}>
        <ImageOff size={18} strokeWidth={1.4} aria-hidden="true" />
      </span>
    );
  }
  // eslint-disable-next-line @next/next/no-img-element
  return <img src={url} alt={alt} className="sv-photo sv-upload-img" />;
}
