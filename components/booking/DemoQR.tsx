/**
 * A QR-shaped placeholder for the prototype: real finder squares, made-up
 * modules, and the word CONTOH across it. It encodes nothing, on purpose. In
 * production the gateway returns the QRIS string and a real QR is drawn from
 * it (or the gateway's own image is shown).
 */
export default function DemoQR({ seed, label }: { seed: string; label: string }) {
  const n = 25;
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  const bit = (x: number, y: number) => {
    let v = h ^ Math.imul(x + 1, 374761393) ^ Math.imul(y + 1, 668265263);
    v = Math.imul(v ^ (v >>> 13), 1274126177);
    return ((v ^ (v >>> 16)) & 1) === 1;
  };
  const inFinder = (x: number, y: number) =>
    (x < 8 && y < 8) || (x >= n - 8 && y < 8) || (x < 8 && y >= n - 8);

  const cells: string[] = [];
  for (let y = 0; y < n; y++) for (let x = 0; x < n; x++) if (!inFinder(x, y) && bit(x, y)) cells.push(`M${x} ${y}h1v1h-1z`);

  const finder = (x: number, y: number) => (
    <g key={`${x}-${y}`}>
      <rect x={x} y={y} width="7" height="7" fill="currentColor" />
      <rect x={x + 1} y={y + 1} width="5" height="5" fill="#fff" />
      <rect x={x + 2} y={y + 2} width="3" height="3" fill="currentColor" />
    </g>
  );

  return (
    <div className="sv-qr">
      <svg viewBox={`-2 -2 ${n + 4} ${n + 4}`} role="img" aria-label={label} shapeRendering="crispEdges">
        <rect x="-2" y="-2" width={n + 4} height={n + 4} fill="#fff" />
        <path d={cells.join("")} fill="currentColor" />
        {finder(0, 0)}
        {finder(n - 7, 0)}
        {finder(0, n - 7)}
      </svg>
      <span className="sv-qr-stamp" aria-hidden="true">
        CONTOH
      </span>
    </div>
  );
}
