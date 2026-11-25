/**
 * Подписи персонажей на бланках. Рисуются сами (SVG), без чужих картинок:
 * у каждого человека своя, детерминированная по id — одна и та же на всех
 * документах. Начальная буква имени + начало фамилии рукописным шрифтом,
 * дальше росчерк и подчёркивание.
 */

function rng(seed: string) {
  let h = 2166136261;
  for (const ch of seed) h = Math.imul(h ^ ch.charCodeAt(0), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

const INKS = ["#24398a", "#2d3f9e", "#3a2f7d", "#1f2d6b", "#2a2a2a"];

export interface SignatureSpec {
  text: string;
  /** Ширина букв (textLength) — росчерк начинается ровно после них */
  textWidth: number;
  skew: number;
  color: string;
  rotate: number;
  path: string;
  width: number;
}

/** «Гульнара Сеитова» → «Г. Сеит», «Юрий Николаевич Кан» → «Ю. Кан» */
function lettersFor(name: string, r: () => number): string {
  const parts = name.replace(/\(.*?\)/g, "").trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "";
  const surname = parts[parts.length - 1];
  const keep = Math.min(surname.length, 2 + Math.floor(r() * 3));
  const initial = parts.length > 1 && r() > 0.35 ? `${parts[0][0]}.` : "";
  return `${initial}${surname.slice(0, keep)}`;
}

export function signatureFor(id: string, name?: string | null): SignatureSpec {
  const r = rng(id);
  const text = name ? lettersFor(name, r) : "";
  const color = INKS[Math.floor(r() * INKS.length)];
  const rotate = -7 + r() * 8;

  // Росчерк: после букв несколько «волн» и возврат линией под подписью
  const charW = 12;
  let x = 8 + text.length * charW;
  const base = 32;
  let d = `M ${x.toFixed(1)} ${base}`;
  const humps = text ? 1 + Math.floor(r() * 2) : 3 + Math.floor(r() * 2);
  for (let i = 0; i < humps; i++) {
    const w = 12 + r() * 10;
    const h = (text ? 12 : 18) * (1 - i / (humps + 2)) + r() * 5;
    d += ` C ${(x + w * 0.2).toFixed(1)} ${(base - h).toFixed(1)}, ${(x + w * 0.6).toFixed(1)} ${(base - h).toFixed(1)}, ${(x + w * 0.5).toFixed(1)} ${base + 2}`;
    d += ` S ${(x + w * 0.9).toFixed(1)} ${(base + 4).toFixed(1)}, ${(x + w).toFixed(1)} ${(base - 2).toFixed(1)}`;
    x += w;
  }
  const end = x;
  // подчёркивание: длинный хвост влево, иногда с петлёй
  const loop = r() > 0.5;
  const uy = base + 8 + r() * 5;
  d += loop
    ? ` C ${(end + 16).toFixed(1)} ${base - 10}, ${(end + 10).toFixed(1)} ${(uy + 6).toFixed(1)}, ${(end - 10).toFixed(1)} ${uy.toFixed(1)}`
    : ` C ${(end + 8).toFixed(1)} ${base + 6}, ${(end - 4).toFixed(1)} ${(uy + 2).toFixed(1)}, ${(end - 18).toFixed(1)} ${uy.toFixed(1)}`;
  d += ` S ${(10 + r() * 10).toFixed(1)} ${(uy + 4 - r() * 6).toFixed(1)}, ${(2 + r() * 6).toFixed(1)} ${(uy - 2 - r() * 6).toFixed(1)}`;

  return { text, textWidth: text.length * charW, skew: -8 - r() * 10, color, rotate, path: d, width: Math.max(110, end + 24) };
}
