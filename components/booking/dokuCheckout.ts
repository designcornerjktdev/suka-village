/**
 * DOKU Checkout in pop-up mode: DOKU's own script draws its payment page as an
 * overlay on ours (DOKU Checkout docs, "modal overlay"). The script is loaded
 * on first use only. If it cannot load, the page opens in a new tab instead.
 */

declare global {
  interface Window {
    loadJokulCheckout?: (url: string) => void;
  }
}

/* One script for both: the sandbox copy the docs name answers with a web page
   (checked 19 Nov 2026), and this one only frames the URL it is given, with
   staging and sandbox among the origins it listens to. */
const SCRIPT = "https://jokul.doku.com/jokul-checkout-js/v1/jokul-checkout-1.0.0.js";

let loading: Promise<void> | null = null;

function loadScript(src: string): Promise<void> {
  loading ??= new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => {
      loading = null;
      reject(new Error("DOKU Checkout script failed to load"));
    };
    document.head.appendChild(s);
  });
  return loading;
}

export async function openDokuCheckout(url: string) {
  try {
    await loadScript(SCRIPT);
    if (!window.loadJokulCheckout) throw new Error("loadJokulCheckout missing");
    /* DOKU's script appends a new modal on every call, all with the same id,
       then shows the FIRST one with that id: after a change of method the
       guest saw the old bank's page. Remove earlier modals first. */
    document.querySelectorAll("#jokul_checkout_modal").forEach((m) => m.remove());
    window.loadJokulCheckout(url);
  } catch {
    window.open(url, "_blank", "noopener,noreferrer");
  }
}
