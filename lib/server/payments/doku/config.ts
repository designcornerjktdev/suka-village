import { createPublicKey } from "node:crypto";
import { readFileSync } from "node:fs";

/**
 * DOKU settings from the environment (.env.example lists them).
 *
 * Keys may be given as PEM text (DOKU_PRIVATE_KEY, DOKU_PUBLIC_KEY; "\n" may
 * be written as the two characters \n) or as file paths (..._PATH). The
 * merchant public key is derived from the private key; it is the one uploaded
 * to the DOKU dashboard.
 */

const pem = (text?: string, path?: string) => {
  if (text?.trim()) return text.replace(/\\n/g, "\n");
  if (path?.trim()) return readFileSync(path, "utf8");
  return "";
};

export type DokuConfig = {
  baseUrl: string;
  clientId: string;
  secretKey: string;
  privateKey: string;
  merchantPublicKey: string;
  /** DOKU's public key, to check the token request DOKU sends us. */
  dokuPublicKey: string;
  /** Per bank, the "Merchant BIN" column of the DOKU dashboard's VA table
      (sent as partnerServiceId; NOT the "Partner Service ID" column, which
      DOKU refuses). Empty means the bank is not set up. */
  va: Record<"va_bca" | "va_bni" | "va_bri" | "va_mandiri", { partnerServiceId: string }>;
  /** QRIS credentials issued once QRIS is approved (dashboard), and the property's postal code. */
  qris: { merchantId: string; terminalId: string; postalCode: string };
};

const bank = (merchantBin?: string) => ({ partnerServiceId: merchantBin?.trim() ?? "" });

export class DokuNotConfigured extends Error {
  constructor(what: string) {
    super(`DOKU is not configured: ${what} missing`);
    this.name = "DokuNotConfigured";
  }
}

export function dokuConfig(): DokuConfig {
  const e = process.env;
  const clientId = e.DOKU_CLIENT_ID?.trim() ?? "";
  const secretKey = e.DOKU_SECRET_KEY?.trim() ?? "";
  const privateKey = pem(e.DOKU_PRIVATE_KEY, e.DOKU_PRIVATE_KEY_PATH);
  if (!clientId) throw new DokuNotConfigured("DOKU_CLIENT_ID");
  if (!secretKey) throw new DokuNotConfigured("DOKU_SECRET_KEY");
  if (!privateKey) throw new DokuNotConfigured("DOKU_PRIVATE_KEY or DOKU_PRIVATE_KEY_PATH");
  return {
    baseUrl: e.DOKU_ENV === "production" ? "https://api.doku.com" : "https://api-sandbox.doku.com",
    clientId,
    secretKey,
    privateKey,
    merchantPublicKey: createPublicKey(privateKey).export({ type: "spki", format: "pem" }).toString(),
    dokuPublicKey: pem(e.DOKU_PUBLIC_KEY, e.DOKU_PUBLIC_KEY_PATH),
    va: {
      va_bca: bank(e.DOKU_VA_BCA),
      va_bni: bank(e.DOKU_VA_BNI),
      va_bri: bank(e.DOKU_VA_BRI),
      va_mandiri: bank(e.DOKU_VA_MANDIRI),
    },
    qris: {
      merchantId: e.DOKU_QRIS_MERCHANT_ID?.trim() ?? "",
      terminalId: e.DOKU_QRIS_TERMINAL_ID?.trim() ?? "",
      postalCode: e.DOKU_QRIS_POSTAL_CODE?.trim() ?? "",
    },
  };
}
