import QRCode from "qrcode";

/**
 * The real QRIS code: the string DOKU returns for the charge, drawn as an SVG
 * in the same frame as DemoQR (class sv-qr), so the order page looks the
 * same. Quiet zone of 2 modules, as DemoQR draws.
 */

/** The dark modules as one SVG path, for the given QR string. */
export function qrPath(value: string): { size: number; d: string } {
  const { modules } = QRCode.create(value, { errorCorrectionLevel: "M" });
  const cells: string[] = [];
  for (let y = 0; y < modules.size; y++) for (let x = 0; x < modules.size; x++) if (modules.get(x, y)) cells.push(`M${x} ${y}h1v1h-1z`);
  return { size: modules.size, d: cells.join("") };
}

export default function QrisCode({ value, label }: { value: string; label: string }) {
  /* No QRIS string stored (the charge was never opened at DOKU): draw nothing
     rather than take the whole order page down. */
  if (!value) return null;
  const { size, d } = qrPath(value);
  return (
    <div className="sv-qr">
      <svg viewBox={`-2 -2 ${size + 4} ${size + 4}`} role="img" aria-label={label} shapeRendering="crispEdges">
        <rect x="-2" y="-2" width={size + 4} height={size + 4} fill="#fff" />
        <path d={d} fill="currentColor" />
      </svg>
    </div>
  );
}
