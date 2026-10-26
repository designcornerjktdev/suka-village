"use client";

import Link from "next/link";
import { useEffect, useState, type ReactNode } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  ArrowUpRight,
  BedDouble,
  CalendarCheck,
  CalendarRange,
  FileText,
  Info,
  LoaderCircle,
  LogOut,
  Menu,
  RotateCcw,
  Settings,
  X,
} from "lucide-react";
import Logo from "../Logo";
import { Toaster, toast } from "./ui";
import { DEMO } from "@/lib/booking/config";
import { adminLogout, resetDemo } from "@/lib/booking/api";
import { useAdminSession, useBookings } from "@/lib/booking/hooks";

/**
 * The admin frame: a forest sidebar on a wide screen, a top bar with a drawer
 * on a phone, and the prototype banner across the top of every screen. There
 * is no dashboard: the admin opens straight on the bookings.
 *
 * It is also the sign in guard. Without a session it sends the visitor to the
 * login and renders nothing; in production the server refuses these routes
 * too, so this guard is only for the interface.
 */

const NAV = [
  { href: "/admin/bookings", label: "Booking", Icon: CalendarCheck },
  { href: "/admin/calendar", label: "Kalender", Icon: CalendarRange },
  { href: "/admin/rooms", label: "Kamar & harga", Icon: BedDouble },
  { href: "/admin/content", label: "Konten", Icon: FileText },
  { href: "/admin/settings", label: "Pengaturan", Icon: Settings },
];

export default function AdminShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname() || "/admin/bookings";
  const session = useAdminSession();
  const bookings = useBookings();
  const [openAt, setOpenAt] = useState<string | null>(null);
  const open = openAt === pathname;

  useEffect(() => {
    if (session === null) router.replace("/admin/login");
  }, [session, router]);

  if (!session) {
    return (
      <div className="ad-gate" role="status">
        <LoaderCircle className="sv-spin" size={20} strokeWidth={1.6} aria-hidden="true" />
        Memuat panel
      </div>
    );
  }

  /* The badge counts what is waiting for a decision, not what is unpaid: it
     is the number of guests waiting on the admin. */
  const waiting = bookings.filter((b) => b.status === "paid").length;
  const current = (href: string) => pathname.startsWith(href);

  const nav = (
    <nav className="ad-nav" aria-label="Menu admin">
      {NAV.map(({ href, label, Icon }) => (
        <Link key={href} href={href} aria-current={current(href) ? "page" : undefined} onClick={() => setOpenAt(null)}>
          <Icon size={18} strokeWidth={1.5} aria-hidden="true" />
          <span>{label}</span>
          {href === "/admin/bookings" && waiting ? (
            <span className="ad-badge tnum" aria-label={`${waiting} perlu dikonfirmasi`}>
              {waiting}
            </span>
          ) : null}
        </Link>
      ))}
    </nav>
  );

  const foot = (
    <div className="ad-side-foot">
      <Link href="/id" target="_blank" rel="noopener noreferrer" className="ad-side-link">
        Lihat situs
        <ArrowUpRight size={14} strokeWidth={1.5} aria-hidden="true" />
      </Link>
      <p className="ad-side-user">{session.email}</p>
      <button
        type="button"
        className="ad-side-link"
        onClick={() => {
          adminLogout();
          router.replace("/admin/login");
        }}
      >
        <LogOut size={15} strokeWidth={1.5} aria-hidden="true" />
        Keluar
      </button>
    </div>
  );

  const brand = (
    <Link href="/admin/bookings" className="ad-brand" aria-label="Suka Village Admin">
      <Logo variant="full" className="ad-brand-logo" />
      <small>Admin</small>
    </Link>
  );

  return (
    <div className="ad-shell">
      <aside className="ad-side">
        {brand}
        {nav}
        {foot}
      </aside>

      <div className="ad-frame">
        <div className="ad-top">
          {brand}
          <button type="button" className="ad-icon-btn ad-icon-btn--light" onClick={() => setOpenAt(open ? null : pathname)} aria-expanded={open} aria-controls="ad-drawer">
            {open ? <X size={20} strokeWidth={1.6} aria-hidden="true" /> : <Menu size={20} strokeWidth={1.6} aria-hidden="true" />}
            <span className="sr-only">Menu</span>
          </button>
        </div>
        {open ? (
          <div id="ad-drawer" className="ad-drawer">
            {nav}
            {foot}
          </div>
        ) : null}

        {DEMO ? (
          <div className="ad-demo">
            <Info size={15} strokeWidth={1.7} aria-hidden="true" />
            <p>
              <strong>Mode demo.</strong> Semua data di sini contoh dan tersimpan di browser ini saja. Developer
              menyambungkannya ke database, payment gateway, dan email.
            </p>
            <button
              type="button"
              className="ad-demo-reset"
              onClick={async () => {
                await resetDemo();
                toast("Data contoh dikembalikan");
              }}
            >
              <RotateCcw size={14} strokeWidth={1.6} aria-hidden="true" />
              Reset data contoh
            </button>
          </div>
        ) : null}

        <main className="ad-main">{children}</main>
      </div>
      <Toaster />
    </div>
  );
}
