"use client";

import type { ReactNode } from "react";
import { usePathname } from "next/navigation";
import { localePath, type Locale } from "@/content/i18n";

/**
 * Everywhere but the home page. The home page is one screen with its own
 * small footer floating over the photograph, so the full footer stays off it.
 */
export default function NotOnHome({ locale, children }: { locale: Locale; children: ReactNode }) {
  const pathname = usePathname() || "";
  const home = localePath(locale);
  if (pathname === home || pathname === `${home}/`) return null;
  return <>{children}</>;
}
