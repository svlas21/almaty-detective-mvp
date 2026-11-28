/**
 * Подписи персонажей на бланках — росчерки «от руки»: крупная заглавная
 * петля, цепочка наклонных петель, иногда отдельный штрих или подчёркивание.
 * Рисуются сами (SVG, гладкая кривая через опорные точки), у каждого человека
 * своя — детерминированно по id, одна и та же на всех документах.
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

type P = [number, number];

/** Гладкая кривая через точки (Catmull-Rom → кубические Безье) */
function smooth(pts: P[]): string {
  if (pts.length < 2) return "";
  let d = `M ${pts[0][0].toFixed(1)} ${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i - 1] ?? pts[i];
    const p1 = pts[i];
    const p2 = pts[i + 1];
    const p3 = pts[i + 2] ?? p2;
    const c1: P = [p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6];
    const c2: P = [p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6];
    d += ` C ${c1[0].toFixed(1)} ${c1[1].toFixed(1)}, ${c2[0].toFixed(1)} ${c2[1].toFixed(1)}, ${p2[0].toFixed(1)} ${p2[1].toFixed(1)}`;
  }
  return d;
}

// Заглавные «буквы» — опорные точки в поле 1000×450
const INITIALS: P[][] = [
  // большая петля снизу-слева вверх-вправо и обратно (как «Д»/«Л»)
  [[40, 405], [15, 350], [70, 250], [210, 150], [395, 50], [405, 72], [330, 145], [160, 300], [122, 292], [150, 205], [265, 140], [372, 122], [376, 140], [300, 185]],
  // высокий штрих с крючком наверху
  [[70, 390], [170, 230], [290, 55], [322, 28], [318, 62], [235, 225], [170, 330], [156, 318], [205, 238], [318, 172]],
  // овал
  [[230, 115], [130, 128], [70, 215], [105, 295], [215, 280], [305, 190], [292, 125], [232, 132], [205, 205], [262, 238]],
  // двойная волна заглавной
  [[30, 300], [110, 120], [180, 70], [200, 110], [140, 260], [170, 270], [270, 110], [300, 90], [305, 130], [260, 230], [300, 220]],
];

const INKS = ["#352a8f", "#2b3a9c", "#3a2d84", "#26348a", "#2f2f6e"];

export interface SignatureSpec {
  paths: string[];
  color: string;
  rotate: number;
  width: number;
  height: number;
}

export function signatureFor(id: string): SignatureSpec {
  const r = rng(id);
  const tpl = INITIALS[Math.floor(r() * INITIALS.length)];
  const sx = 0.8 + r() * 0.4;
  const sy = 0.8 + r() * 0.35;
  const j = () => (r() - 0.5) * 18;
  const pts: P[] = tpl.map(([x, y]) => [x * sx + j(), y * sy + j()]);

  // Цепочка наклонных петель, затухающих к концу
  let [x, baseY] = pts[pts.length - 1];
  baseY = Math.max(baseY, 200 * sy);
  const n = 3 + Math.floor(r() * 5);
  const step = 58 + r() * 26;
  const lean = 55 + r() * 35;
  for (let i = 0; i < n; i++) {
    const amp = (150 - i * (80 / n)) * (0.8 + r() * 0.4);
    pts.push([x + lean + step * 0.55, baseY - amp]);
    pts.push([x + lean + step * 0.75, baseY - amp + 18]);
    pts.push([x + step * 0.45, baseY + j() * 0.4]);
    x += step;
  }
  const end = pts[pts.length - 1];
  const paths = [smooth(pts)];

  // Финал: отдельный штрих, подчёркивание назад или ничего
  const tail = r();
  let maxX = x + lean + step;
  if (tail < 0.45) {
    const y0 = baseY - 90 - r() * 40;
    const x0 = x + 60 + r() * 50;
    const len = 80 + r() * 60;
    paths.push(smooth([[x0, y0 + 8], [x0 + len * 0.5, y0 - 4], [x0 + len, y0 - 10]]));
    maxX = Math.max(maxX, x0 + len);
  } else if (tail < 0.8) {
    const uy = baseY + 60 + r() * 40;
    paths[0] = smooth([...pts, [end[0] + 40, end[1] + 30], [end[0] - 80, uy], [pts[0][0] + 60, uy + 20], [pts[0][0] - 10, uy + 5]]);
  }

  return {
    paths,
    color: INKS[Math.floor(r() * INKS.length)],
    rotate: -6 + r() * 6,
    width: Math.ceil(maxX + 30),
    height: 460,
  };
}
