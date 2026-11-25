import { useId } from "react";

/**
 * Печати и штампы на бланках дела (рисуются сами, SVG):
 * круглые гербовые (ГУВД, РОВД, прокуратура) — герб в центре, по кругу
 * название на казахском и русском (как в Положении о печатях 1996 г.);
 * печати экспертных служб без герба; угловые штампы организаций;
 * красный штамп «Приобщено к делу». Оттиск неровный — фильтр «чернила».
 */

const INK = "#3b3f9a";
const RED = "#a3271c";

function InkFilter({ id, seed = 3, strength = 1 }: { id: string; seed?: number; strength?: number }) {
  return (
    <filter id={id} x="-5%" y="-5%" width="110%" height="110%">
      <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="2" seed={seed} result="n" />
      <feColorMatrix
        in="n"
        type="matrix"
        values={`0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 ${-2.2 * strength} ${1.75}`}
        result="mask"
      />
      <feComposite in="SourceGraphic" in2="mask" operator="in" />
    </filter>
  );
}

/** Государственный герб (public/stamps/emblem.png — оттиск, уже в цвете чернил). */
function Emblem({ r }: { r: number }) {
  return <image href="/stamps/emblem.png" x={100 - r} y={100 - r} width={2 * r} height={2 * r} preserveAspectRatio="xMidYMid meet" />;
}

interface RoundProps {
  outer: string;
  inner?: string;
  center?: string[];
  emblem?: boolean;
  color?: string;
  size?: number;
  rotate?: number;
  seed?: number;
  className?: string;
}

/** Круглая печать: внешнее кольцо текста, внутреннее (если есть), центр — герб или надпись. */
export function RoundSeal({ outer, inner, center, emblem, color = INK, size = 118, rotate = -8, seed = 3, className }: RoundProps) {
  const uid = useId().replace(/:/g, "");
  const fOuter = `so${uid}`;
  const fInner = `si${uid}`;
  const ink = `ink${uid}`;
  const circle = (r: number) => `M ${100 - r} 100 a ${r} ${r} 0 1 1 ${2 * r} 0 a ${r} ${r} 0 1 1 ${-2 * r} 0`;
  const rO = 79;
  const rI = 57;
  return (
    <svg
      viewBox="0 0 200 200"
      width={size}
      height={size}
      className={className ?? "stamp-round"}
      style={{ transform: `rotate(${rotate}deg)` }}
      aria-hidden="true"
    >
      <defs>
        <path id={fOuter} d={circle(rO)} />
        <path id={fInner} d={circle(rI)} />
        <InkFilter id={ink} seed={seed} />
      </defs>
      <g filter={`url(#${ink})`} fill={color} stroke={color}>
        <circle cx="100" cy="100" r="96" fill="none" strokeWidth="3.2" />
        <circle cx="100" cy="100" r="91" fill="none" strokeWidth="1" />
        <text stroke="none" style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: 13.5, fontWeight: 700 }}>
          <textPath href={`#${fOuter}`} startOffset="0" textLength={2 * Math.PI * rO * 0.985} lengthAdjust="spacing">
            {outer} ★
          </textPath>
        </text>
        <circle cx="100" cy="100" r={inner ? 67 : 69} fill="none" strokeWidth="1.2" />
        {inner && (
          <>
            <text stroke="none" style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: 10.5, fontWeight: 700 }}>
              <textPath href={`#${fInner}`} startOffset="0" textLength={2 * Math.PI * rI * 0.98} lengthAdjust="spacing">
                {inner} •
              </textPath>
            </text>
            <circle cx="100" cy="100" r="47" fill="none" strokeWidth="1" />
          </>
        )}
        {emblem ? (
          <Emblem r={inner ? 45 : 66} />
        ) : (
          (center ?? []).map((line, i, all) => (
            <text
              key={i}
              x="100"
              y={100 + (i - (all.length - 1) / 2) * 17 + 5}
              textAnchor="middle"
              stroke="none"
              style={{ fontFamily: "Arial, Helvetica, sans-serif", fontSize: i === 0 ? 17 : 12, fontWeight: 700 }}
            >
              {line}
            </text>
          ))
        )}
      </g>
    </svg>
  );
}

/** Угловой штамп организации (левый верхний угол справки). */
export function CornerStamp({ lines, seed = 5 }: { lines: string[]; seed?: number }) {
  const uid = useId().replace(/:/g, "");
  const ink = `ink${uid}`;
  const h = 26 + lines.length * 15 + 26;
  return (
    <svg viewBox={`0 0 250 ${h}`} width={250} height={h} className="stamp-corner" aria-hidden="true">
      <defs>
        <InkFilter id={ink} seed={seed} strength={0.8} />
      </defs>
      <g filter={`url(#${ink})`} fill={INK} style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
        {lines.map((l, i) => (
          <text key={i} x="125" y={22 + i * 15} textAnchor="middle" style={{ fontSize: i === 0 ? 12.5 : 10.5, fontWeight: i === 0 ? 700 : 400 }}>
            {l}
          </text>
        ))}
        <text x="125" y={h - 14} textAnchor="middle" style={{ fontSize: 10.5 }}>
          № ______ от «___» __________ 199__ г.
        </text>
      </g>
    </svg>
  );
}

/** Красный штамп «Приобщено к делу» с номером листа. */
export function AttachedStamp({ sheet }: { sheet?: number }) {
  const uid = useId().replace(/:/g, "");
  const ink = `ink${uid}`;
  return (
    <svg viewBox="0 0 200 74" width={150} height={56} className="stamp-attached" aria-hidden="true">
      <defs>
        <InkFilter id={ink} seed={(sheet ?? 1) * 7} strength={0.9} />
      </defs>
      <g filter={`url(#${ink})`} fill={RED} stroke={RED} style={{ fontFamily: "Arial, Helvetica, sans-serif" }}>
        <rect x="3" y="3" width="194" height="68" rx="4" fill="none" strokeWidth="3" />
        <text x="100" y="27" textAnchor="middle" stroke="none" style={{ fontSize: 17, fontWeight: 800, letterSpacing: 1.5 }}>
          ПРИОБЩЕНО
        </text>
        <text x="100" y="45" textAnchor="middle" stroke="none" style={{ fontSize: 11.5, fontWeight: 700 }}>
          К УГОЛОВНОМУ ДЕЛУ № 9704
        </text>
        <text x="100" y="63" textAnchor="middle" stroke="none" style={{ fontSize: 11.5, fontWeight: 700 }}>
          л.д. ______
        </text>
      </g>
      {sheet ? (
        <text x="118" y="62" textAnchor="middle" fill="#24398a" style={{ fontFamily: "var(--font-hand), cursive", fontSize: 18 }}>
          {sheet}
        </text>
      ) : null}
    </svg>
  );
}

// ───────── Какая печать на каком документе ─────────

type SealDef = { outer: string; inner?: string; center?: string[]; emblem?: boolean };

export const SEALS: Record<string, SealDef> = {
  guvd: {
    outer: "АЛМАТЫ ҚАЛАСЫНЫҢ ІШКІ ІСТЕР БАС БАСҚАРМАСЫ",
    inner: "ГУВД г. АЛМАТЫ МВД РЕСПУБЛИКИ КАЗАХСТАН",
    emblem: true,
  },
  rovd: {
    outer: "АЛМАТЫ ҚАЛАСЫ МЕДЕУ АУДАНДЫҚ ІШКІ ІСТЕР БӨЛІМІ",
    inner: "МЕДЕУСКИЙ РОВД г. АЛМАТЫ",
    emblem: true,
  },
  prosecutor: {
    outer: "АЛМАТЫ ҚАЛАСЫНЫҢ ПРОКУРАТУРАСЫ",
    inner: "ПРОКУРАТУРА г. АЛМАТЫ",
    emblem: true,
  },
  eko: {
    outer: "ЭКСПЕРТНО-КРИМИНАЛИСТИЧЕСКИЙ ОТДЕЛ ГУВД г. АЛМАТЫ",
    center: ["ЭКО", "для", "заключений"],
  },
  sme: {
    outer: "АЛМАТИНСКОЕ ГОРОДСКОЕ БЮРО СУДЕБНО-МЕДИЦИНСКОЙ ЭКСПЕРТИЗЫ",
    center: ["СМЭ", "для", "заключений"],
  },
  ivc: {
    outer: "ИНФОРМАЦИОННО-ВЫЧИСЛИТЕЛЬНЫЙ ЦЕНТР ГУВД г. АЛМАТЫ",
    center: ["ИВЦ", "№ 2"],
  },
};

export const CORNERS: Record<string, string[]> = {
  power: ["ДИСПЕТЧЕРСКАЯ СЛУЖБА", "районных электрических сетей", "г. Алматы", "тел. 33-41-08"],
  pager: ["ПЕЙДЖИНГОВАЯ СВЯЗЬ", "служба операторов", "г. Алматы, пр. Абая", "тел. 50-12-00"],
  address: ["АДРЕСНО-СПРАВОЧНОЕ БЮРО", "ГУВД г. Алматы", "тел. 62-14-30"],
  hostel: ["ОБЩЕЖИТИЕ", "у Зелёного базара", "г. Алматы"],
  academy: ["ВЫСШАЯ ШКОЛА МВД", "Республики Казахстан", "кафедра криминологии"],
};

export interface FormStamps {
  seal?: keyof typeof SEALS;
  corner?: keyof typeof CORNERS;
}

/** Выбор печати и углового штампа по названию документа и подписанту. */
export function stampsFor(kind: string, name: string, signerName?: string | null): FormStamps {
  const n = name.toLowerCase();
  const who = (signerName ?? "").toLowerCase();
  if (kind === "testimony") return {};
  if (n.includes("ровд")) return { seal: "rovd" };
  if (n.includes("санкция") || n.includes("прокурор")) return { seal: "prosecutor" };
  if (n.includes("электросет")) return { corner: "power", seal: undefined };
  if (n.includes("пейджинг")) return { corner: "pager" };
  if (n.includes("адресное бюро")) return { corner: "address", seal: "guvd" };
  if (/(^|\s)кан(\s|$)/.test(who) || n.includes("смэ") || n.includes("морге") || n.includes("освидетельствование"))
    return { seal: "sme" };
  if (who.includes("сеитова")) return { seal: "eko" };
  if (who.includes("абишев") || n.includes("иц/")) return { seal: "ivc" };
  if (who.includes("бейсенов")) return { corner: "academy" };
  if (kind === "thing") return {};
  return { seal: "guvd" };
}
