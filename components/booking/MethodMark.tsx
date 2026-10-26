import type { MethodInfo } from "@/lib/booking/payments";

/**
 * A payment method as people recognise it: by its logo. The method's name is
 * still there for screen readers (and shown as text when no free logo
 * exists, as with ShopeePay), so the logo is decoration over a real label.
 *
 * Plain <img>: these are small SVG files with nothing for an image optimiser
 * to do, and next/image refuses SVG without opening that up site wide.
 */
export default function MethodMark({ method, label, size = "md" }: { method: MethodInfo; label?: string; size?: "sm" | "md" }) {
  const name = label ?? method.label;
  if (!method.logos.length) return <span className="sv-mark-text">{name}</span>;
  return (
    <span className="sv-mark" data-size={size} data-group={method.group}>
      {method.logos.map((src) => (
        // eslint-disable-next-line @next/next/no-img-element
        <img key={src} src={src} alt="" loading="lazy" decoding="async" />
      ))}
      <span className="sr-only">{name}</span>
    </span>
  );
}
