/**
 * Checks the DOKU sandbox setup end to end, without touching the database:
 *   npm run doku:check            token only
 *   npm run doku:check -- va_bni  token, then create and delete one test VA
 *   npm run doku:check -- dana    token, then one test e-wallet payment link
 *   npm run doku:check -- card    token, then one test card payment page (Non-SNAP)
 *
 * Reads DOKU_* from .env. Refuses to run against production.
 */
import "dotenv/config";
import { dokuConfig } from "@/lib/server/payments/doku/config";
import { createVa, deleteVa, isVa } from "@/lib/server/payments/doku/va";
import { dokuRequest } from "@/lib/server/payments/doku/client";
import { createCardPage } from "@/lib/server/payments/doku/card";
import { createEwallet, isEwallet } from "@/lib/server/payments/doku/ewallet";

/* tsx runs scripts as CommonJS, which has no top-level await. */
async function main() {
  if (process.env.DOKU_ENV === "production") {
    console.error("Refusing to run against production (DOKU_ENV=production).");
    process.exitCode = 1;
    return;
  }

  const c = dokuConfig();
  console.log(`Sandbox: ${c.baseUrl}`);
  console.log(`DOKU public key: ${c.dokuPublicKey ? "set" : "MISSING (needed for notifications)"}`);

  /* A harmless signed call that also proves the token works: DOKU answers it
     with a business error, not 401, when the signature is right. */
  try {
    await dokuRequest("POST", "/orders/v1.0/transfer-va/status", { partnerServiceId: "        ", customerNo: "0", virtualAccountNo: "0", additionalInfo: {} });
    console.log("Token and signature: OK");
  } catch (e) {
    const err = e as { code?: string; status?: number; message: string };
    if (err.status === 401) {
      console.error(`Token or signature REFUSED: ${err.message}`);
      process.exitCode = 1;
      return;
    }
    console.log(`Token and signature: OK (DOKU answered ${err.code}, expected for a dummy request)`);
  }

  const method = process.argv[2];
  if (!method) return;
  if (method === "card") {
    const r = await createCardPage({
      trxId: `SVTEST-${Date.now()}`,
      code: "SVTEST",
      amount: 10000,
      locale: "id",
      returnUrl: "https://sukavillage.com/id",
      guest: { name: "Tes Sandbox", email: "sandbox@example.com", phone: "+6281200000000" },
    });
    console.log(`Created card payment page ${r.gatewayId}: ${r.reference}`);
    return;
  }
  if (isEwallet(method)) {
    const r = await createEwallet({
      trxId: `SVTEST-${Date.now()}`,
      method,
      amount: 10000,
      expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
      returnUrl: "https://sukavillage.com/id",
      ip: "127.0.0.1",
      title: "Suka Village sandbox test",
    });
    console.log(`Created ${method} payment ${r.gatewayId}: ${r.reference}`);
    return;
  }
  if (!isVa(method)) throw new Error(`Not a VA or e-wallet method: ${method}`);
  const r = await createVa({
    trxId: `SVTEST-${Date.now()}`,
    method,
    amount: 10000,
    expiresAt: new Date(Date.now() + 30 * 60_000).toISOString(),
    guest: { name: "Tes Sandbox", email: "sandbox@example.com", phone: "+6281200000000" },
  });
  console.log(`Created VA ${r.reference} (trxId ${r.gatewayId})`);
  await deleteVa({ method, reference: r.reference, trxId: r.gatewayId });
  console.log("Deleted it again.");
}

main().catch((e) => {
  console.error(e instanceof Error ? e.message : e);
  process.exitCode = 1;
});
