import { Poppins } from "next/font/google";

/**
 * Type, as the owner set it (21 October 2026, "dicoba dulu"): Helvetica for
 * headings, Poppins for everything else. Declared once and shared by both
 * root layouts (the public site under [lang] and the admin).
 *
 * Helvetica is not on Google Fonts and its web licence is sold separately, so
 * headings use the copy the visitor's system already has: Helvetica Neue or
 * Helvetica on Apple devices, Arial (drawn to the same metrics) on Windows,
 * and the system sans elsewhere. The stack is --font-head in globals.css.
 *
 * Poppins has no variable version, so only the weights the styles ask for
 * are loaded.
 */
export const poppins = Poppins({
  variable: "--font-poppins",
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  display: "swap",
});

export const fontVars = poppins.variable;
