import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import { fontVars } from "../fonts";
import "../globals.css";
import "./admin.css";

/**
 * The admin's own root layout: same fonts and tokens as the site, none of its
 * chrome (no header, footer, smooth scrolling or locale). Indonesian only;
 * this is the owner's tool.
 *
 * Never indexed. In production every route under /admin is also behind
 * authentication on the server (docs/BOOKING.md, "Admin access").
 */

export const metadata: Metadata = {
  title: { default: "Admin · Suka Village", template: "%s · Admin Suka Village" },
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
};

export default function AdminRootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="id" className={`${fontVars} antialiased`}>
      <body className="ad-body">{children}</body>
    </html>
  );
}
