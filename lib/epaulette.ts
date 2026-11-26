/**
 * Погон милиции 1996 года — SVG-строкой, чтобы один рисунок шёл и на экран, и в картинку для «Поделиться».
 * Ступени: 1 лейтенант (2 малые звезды), 2 старший лейтенант (3), 3 капитан (4),
 * 4 майор (1 большая, два просвета), 5 полковник (3 большие, два просвета).
 */
function star(cx: number, cy: number, r: number, id: number) {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const rr = i % 2 === 0 ? r : r * 0.42;
    pts.push(`${(cx + rr * Math.cos(a)).toFixed(1)},${(cy + rr * Math.sin(a)).toFixed(1)}`);
  }
  return `<g class="ep-star" style="--i:${id}"><polygon points="${pts.join(" ")}" fill="url(#gold)" stroke="#6e5418" stroke-width="1.2"/>
  <polygon points="${pts.join(" ")}" fill="none" stroke="#fff3c4" stroke-opacity=".35" stroke-width=".6" transform="translate(-.6 -.6)"/></g>`;
}

export function epauletteSvg(level: number): string {
  const field = level >= 4; // старший состав — два просвета, большие звёзды
  const small = 11;
  const big = 19;
  const layouts: Record<number, [number, number, number][]> = {
    1: [[56, 300, small], [104, 300, small]],
    2: [[56, 300, small], [104, 300, small], [80, 252, small]],
    3: [[56, 300, small], [104, 300, small], [80, 252, small], [80, 204, small]],
    4: [[80, 262, big]],
    5: [[58, 300, big], [102, 300, big], [80, 230, big]],
  };
  const stars = (layouts[Math.min(5, Math.max(1, level))] ?? layouts[1]).map(([x, y, r], i) => star(x, y, r, i)).join("");
  const stripes = field
    ? `<rect x="54" y="96" width="9" height="284" fill="#a3242a"/><rect x="97" y="96" width="9" height="284" fill="#a3242a"/>`
    : `<rect x="76" y="96" width="8" height="284" fill="#a3242a"/>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 390" width="160" height="390">
<defs>
  <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#f4dc8a"/><stop offset=".5" stop-color="#c9a24a"/><stop offset="1" stop-color="#8a6a22"/></linearGradient>
  <radialGradient id="btn" cx=".35" cy=".35" r=".8"><stop offset="0" stop-color="#f6e29a"/><stop offset=".6" stop-color="#c39b40"/><stop offset="1" stop-color="#6e5418"/></radialGradient>
  <pattern id="twill" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(35)"><rect width="6" height="6" fill="#3b4553"/><rect width="2" height="6" fill="#36404d"/></pattern>
  <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".28"/><stop offset=".25" stop-color="#000" stop-opacity="0"/><stop offset=".75" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".32"/></linearGradient>
  <clipPath id="body"><path d="M22 388 L22 74 Q22 30 80 16 Q138 30 138 74 L138 388 Z"/></clipPath>
</defs>
<path d="M22 388 L22 74 Q22 30 80 16 Q138 30 138 74 L138 388 Z" fill="url(#twill)"/>
<g clip-path="url(#body)">${stripes}<rect x="0" y="0" width="160" height="390" fill="url(#shade)"/></g>
<path d="M22 388 L22 74 Q22 30 80 16 Q138 30 138 74 L138 388" fill="none" stroke="#a3242a" stroke-width="7"/>
<path d="M26 388 L26 75 Q26 35 80 21 Q134 35 134 75 L134 388" fill="none" stroke="#000" stroke-opacity=".25" stroke-width="1"/>
<circle cx="80" cy="60" r="15" fill="url(#btn)" stroke="#5c4512" stroke-width="1.2"/>
<path d="M80 50 l2.6 6.4 6.8.4 -5.3 4.3 1.8 6.6 -5.9-3.8 -5.9 3.8 1.8-6.6 -5.3-4.3 6.8-.4z" fill="#7a5c1c" opacity=".7"/>
${stars}
</svg>`;
}
