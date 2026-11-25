import { signatureFor } from "@/lib/signature";

/** Подпись чернилами над строкой «(подпись)». id — постоянный ключ персонажа. */
export default function Signature({ id, name, className }: { id: string; name?: string | null; className?: string }) {
  const s = signatureFor(id, name);
  return (
    <svg
      className={className ?? "signature"}
      viewBox={`0 0 ${s.width} 52`}
      width={s.width}
      height={52}
      role="img"
      aria-label={name ? `Подпись: ${name}` : "Подпись"}
      style={{ transform: `rotate(${s.rotate.toFixed(1)}deg)`, color: s.color }}
    >
      <g transform={`skewX(${s.skew.toFixed(1)}) translate(${(-s.skew * 0.5).toFixed(1)} 0)`}>
        {s.text && (
          <text
            x="8"
            y="33"
            textLength={s.textWidth}
            lengthAdjust="spacingAndGlyphs"
            fill="currentColor"
            style={{ fontFamily: "var(--font-hand), cursive", fontSize: 28 }}
          >
            {s.text}
          </text>
        )}
        <path d={s.path} fill="none" stroke="currentColor" strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
      </g>
    </svg>
  );
}
