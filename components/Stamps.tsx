import { useId } from "react";

/**
 * Печати и штампы на бланках дела (рисуются сами, SVG):
 * круглые гербовые (ГУВД, РОВД, прокуратура) — герб в центре, по кругу
 * название на казахском и русском (как в Положении о печатях 1996 г.);
 * печати экспертных служб без герба; угловые штампы организаций;
 * красный штамп «Приобщено к делу». Оттиск неровный — фильтр «чернила».
 */

const INK = "#3443b8";
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
  /** Внешняя полоса (крупно, повторяется по кругу) */
  band: string;
  /** Мелкий плотный текст по всему кругу: казахский, затем русский */
  small: string;
  /** Средний текст по верхней дуге */
  top?: string;
  /** Средний текст по нижней дуге (читается слева направо) */
  bottom?: string;
  /** Без герба — надпись в центре */
  center?: string[];
  emblem?: boolean;
  color?: string;
  size?: number;
  rotate?: number;
  seed?: number;
  className?: string;
}

const SEAL_FONT = "'Arial Narrow', 'Roboto Condensed', Arial, Helvetica, sans-serif";

/**
 * Круглая печать по образцу казахстанских гербовых: толстый обод, полоса
 * «ҚАЗАҚСТАН РЕСПУБЛИКАСЫ», мелкий плотный текст на двух языках по кругу,
 * название по верхней дуге, подпись по нижней, герб в центре.
 */
export function RoundSeal({ band, small, top, bottom, center, emblem, color = INK, size = 118, rotate = -8, seed = 3, className }: RoundProps) {
  const uid = useId().replace(/:/g, "");
  const ink = `ink${uid}`;
  const full = (r: number) => `M ${100 - r} 100 a ${r} ${r} 0 1 1 ${2 * r} 0 a ${r} ${r} 0 1 1 ${-2 * r} 0`;
  const upper = (r: number) => `M ${100 - r} 100 A ${r} ${r} 0 0 1 ${100 + r} 100`;
  const lower = (r: number) => `M ${100 - r} 100 A ${r} ${r} 0 0 0 ${100 + r} 100`;
  const ids = { band: `b${uid}`, small: `s${uid}`, top: `t${uid}`, bottom: `u${uid}` };
  const bandText = `${band} ✻ ${band} ✻ `;
  const font = { fontFamily: SEAL_FONT, fontWeight: 700 } as const;
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
        <path id={ids.band} d={full(87.5)} />
        <path id={ids.small} d={full(73.5)} />
        <path id={ids.top} d={upper(62)} />
        <path id={ids.bottom} d={lower(68)} />
        <InkFilter id={ink} seed={seed} strength={0.55} />
      </defs>
      <g filter={`url(#${ink})`} fill={color} stroke={color}>
        <circle cx="100" cy="100" r="97" fill="none" strokeWidth="3.4" />
        <text stroke="none" style={{ ...font, fontSize: 10.5, letterSpacing: 1.2 }}>
          <textPath href={`#${ids.band}`} textLength={2 * Math.PI * 87.5 * 0.99} lengthAdjust="spacing">
            {bandText}
          </textPath>
        </text>
        <circle cx="100" cy="100" r="81.5" fill="none" strokeWidth="1.1" />
        <text stroke="none" style={{ ...font, fontSize: 6.4 }}>
          <textPath href={`#${ids.small}`} textLength={2 * Math.PI * 73.5 * 0.985} lengthAdjust="spacingAndGlyphs">
            {small} ✻
          </textPath>
        </text>
        {top && (
          <text stroke="none" style={{ ...font, fontSize: 9 }}>
            <textPath
              href={`#${ids.top}`}
              startOffset="50%"
              textAnchor="middle"
              {...(top.length > 26 ? { textLength: Math.PI * 62 * 0.86, lengthAdjust: "spacingAndGlyphs" } : {})}
            >
              {top}
            </textPath>
          </text>
        )}
        {bottom && (
          <text stroke="none" style={{ ...font, fontSize: 9, letterSpacing: 1.6 }}>
            <textPath href={`#${ids.bottom}`} startOffset="50%" textAnchor="middle">
              {bottom}
            </textPath>
          </text>
        )}
        {emblem ? (
          <Emblem r={48} />
        ) : (
          (center ?? []).map((line, i, all) => (
            <text
              key={i}
              x="100"
              y={100 + (i - (all.length - 1) / 2) * 16 + 5}
              textAnchor="middle"
              stroke="none"
              style={{ ...font, fontSize: i === 0 ? 18 : 10 }}
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

type SealDef = Omit<RoundProps, "color" | "size" | "rotate" | "seed" | "className">;

const KZ = "ҚАЗАҚСТАН РЕСПУБЛИКАСЫ";

export const SEALS: Record<string, SealDef> = {
  guvd: {
    band: KZ,
    small:
      "ҚАЗАҚСТАН РЕСПУБЛИКАСЫ ІШКІ ІСТЕР МИНИСТРЛІГІНІҢ АЛМАТЫ ҚАЛАСЫ БОЙЫНША ІШКІ ІСТЕР БАС БАСҚАРМАСЫ ✻ ГЛАВНОЕ УПРАВЛЕНИЕ ВНУТРЕННИХ ДЕЛ г. АЛМАТЫ МВД РЕСПУБЛИКИ КАЗАХСТАН",
    top: "Ішкі істер бас басқармасы ✻ ГУВД г. Алматы",
    bottom: "Канцелярия",
    emblem: true,
  },
  rovd: {
    band: KZ,
    small:
      "АЛМАТЫ ҚАЛАСЫ ІШКІ ІСТЕР БАС БАСҚАРМАСЫНЫҢ МЕДЕУ АУДАНДЫҚ ІШКІ ІСТЕР БӨЛІМІ ✻ МЕДЕУСКИЙ РАЙОННЫЙ ОТДЕЛ ВНУТРЕННИХ ДЕЛ ГУВД г. АЛМАТЫ",
    top: "Медеу аудандық ІІБ ✻ Медеуский РОВД",
    bottom: "Дежурная часть",
    emblem: true,
  },
  prosecutor: {
    band: KZ,
    small:
      "ҚАЗАҚСТАН РЕСПУБЛИКАСЫ БАС ПРОКУРАТУРАСЫНЫҢ АЛМАТЫ ҚАЛАСЫНЫҢ ПРОКУРАТУРАСЫ ✻ ПРОКУРАТУРА г. АЛМАТЫ ГЕНЕРАЛЬНОЙ ПРОКУРАТУРЫ РЕСПУБЛИКИ КАЗАХСТАН",
    top: "Қала прокуратурасы ✻ Прокуратура города",
    bottom: "Алматы",
    emblem: true,
  },
  eko: {
    band: "АЛМАТЫ ҚАЛАСЫ ІІББ",
    small:
      "АЛМАТЫ ҚАЛАСЫ ІШКІ ІСТЕР БАС БАСҚАРМАСЫНЫҢ САРАПТАУ-КРИМИНАЛИСТИКАЛЫҚ БӨЛІМІ ✻ ЭКСПЕРТНО-КРИМИНАЛИСТИЧЕСКИЙ ОТДЕЛ ГУВД г. АЛМАТЫ",
    center: ["ЭКО", "для заключений"],
  },
  sme: {
    band: "АЛМАТЫ ҚАЛАСЫ",
    small:
      "АЛМАТЫ ҚАЛАЛЫҚ СОТ-МЕДИЦИНАЛЫҚ САРАПТАМА БЮРОСЫ ✻ АЛМАТИНСКОЕ ГОРОДСКОЕ БЮРО СУДЕБНО-МЕДИЦИНСКОЙ ЭКСПЕРТИЗЫ",
    center: ["СМЭ", "для заключений"],
  },
  ivc: {
    band: "АЛМАТЫ ҚАЛАСЫ ІІББ",
    small:
      "АЛМАТЫ ҚАЛАСЫ ІШКІ ІСТЕР БАС БАСҚАРМАСЫНЫҢ АҚПАРАТТЫҚ-ЕСЕПТЕУ ОРТАЛЫҒЫ ✻ ИНФОРМАЦИОННО-ВЫЧИСЛИТЕЛЬНЫЙ ЦЕНТР ГУВД г. АЛМАТЫ",
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
