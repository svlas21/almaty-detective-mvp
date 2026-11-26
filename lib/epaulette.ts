/**
 * Погон полиции Казахстана (по образцу автора): синее сукно с казахским орнаментом,
 * красный кант и золотой галун по краю, золотая пуговица, кокарда-венок, красный просвет, золотые звёзды.
 * SVG-строкой, чтобы один рисунок шёл и на экран, и в картинку для «Поделиться».
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
  // грани звезды: светлая и тёмная половины каждого луча
  const facets: string[] = [];
  for (let i = 0; i < 5; i++) {
    const a = -Math.PI / 2 + (i * 2 * Math.PI) / 5;
    const tip = `${(cx + r * Math.cos(a)).toFixed(1)},${(cy + r * Math.sin(a)).toFixed(1)}`;
    const b = a + Math.PI / 5;
    const inner = `${(cx + r * 0.42 * Math.cos(b)).toFixed(1)},${(cy + r * 0.42 * Math.sin(b)).toFixed(1)}`;
    facets.push(`<polygon points="${cx},${cy} ${tip} ${inner}" fill="#7d5d14" opacity=".45"/>`);
  }
  return `<g class="ep-star" style="--i:${id}"><polygon points="${pts.join(" ")}" fill="url(#gold)" stroke="#5e4510" stroke-width="1"/>${facets.join("")}</g>`;
}

/** Плитка орнамента «қошқар мүйіз» — завитки бараньих рогов. */
const ORNAMENT = `<pattern id="orn" width="32" height="24" patternUnits="userSpaceOnUse">
  <rect width="32" height="24" fill="#22308c"/>
  <g fill="none" stroke="#3143ad" stroke-width="1.8" stroke-linecap="round">
    <path d="M16 20 C16 12 9 12 9 7.5 C9 4.5 12.5 4 13.2 6.4 C13.7 8 12 8.8 11.2 7.8"/>
    <path d="M16 20 C16 12 23 12 23 7.5 C23 4.5 19.5 4 18.8 6.4 C18.3 8 20 8.8 20.8 7.8"/>
    <path d="M0 8 C3 8 4 4 1.5 3.4"/><path d="M32 8 C29 8 28 4 30.5 3.4"/>
    <path d="M-2 24 C2 20 6 22 4 25"/><path d="M34 24 C30 20 26 22 28 25"/>
  </g>
</pattern>`;

/** Кокарда: венок (открыт сверху) с солнцем и шаныраком в центре. */
const BADGE = `<g transform="translate(80 120)">
  <g fill="url(#gold)" stroke="#5e4510" stroke-width=".6">
    ${Array.from({ length: 13 }, (_, i) => {
      const deg = -50 + i * 23.3; // от −50° до 230°, сверху разрыв
      const a = (deg * Math.PI) / 180;
      const x = 21 * Math.cos(a), y = 21 * Math.sin(a);
      return `<ellipse cx="${x.toFixed(1)}" cy="${y.toFixed(1)}" rx="3" ry="6.8" transform="rotate(${(deg + (deg < 90 ? 20 : -20)).toFixed(0)} ${x.toFixed(1)} ${y.toFixed(1)})"/>`;
    }).join("")}
  </g>
  <circle r="13" fill="url(#gold)" stroke="#5e4510" stroke-width="1"/>
  <g stroke="#7d5d14" stroke-width="1.2">${Array.from({ length: 12 }, (_, i) => {
    const a = (i * 30 * Math.PI) / 180;
    return `<line x1="${(8 * Math.cos(a)).toFixed(1)}" y1="${(8 * Math.sin(a)).toFixed(1)}" x2="${(12 * Math.cos(a)).toFixed(1)}" y2="${(12 * Math.sin(a)).toFixed(1)}"/>`;
  }).join("")}</g>
  <circle r="6.5" fill="#22308c" stroke="#7d5d14" stroke-width="1"/>
  <path d="M-4 0 H4 M0 -4 V4 M-3 -3 L3 3 M3 -3 L-3 3" stroke="#e8c96a" stroke-width="1.2"/>
</g>`;

export function epauletteSvg(level: number): string {
  const lvl = Math.min(5, Math.max(1, level));
  const field = lvl >= 4;
  const s = 11.5;
  const b = 19;
  const layouts: Record<number, [number, number, number][]> = {
    1: [[50, 338, s], [110, 338, s]],
    2: [[50, 338, s], [110, 338, s], [80, 276, s]],
    3: [[50, 338, s], [110, 338, s], [80, 276, s], [80, 214, s]],
    4: [[80, 300, b]],
    5: [[52, 332, b], [108, 332, b], [80, 256, b]],
  };
  const stars = layouts[lvl].map(([x, y, r], i) => star(x, y, r, i)).join("");
  const stripes = field
    ? `<rect x="57" y="150" width="7" height="240" fill="#d0262e"/><rect x="96" y="150" width="7" height="240" fill="#d0262e"/>`
    : `<rect x="76.5" y="150" width="7" height="240" fill="#d0262e"/>`;
  const outline = "M18 390 L18 78 Q18 18 80 18 Q142 18 142 78 L142 390 Z";
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 160 392" width="160" height="392">
<defs>
  <linearGradient id="gold" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fbe7a1"/><stop offset=".45" stop-color="#d4ad4e"/><stop offset="1" stop-color="#8a6618"/></linearGradient>
  <radialGradient id="btn" cx=".35" cy=".32" r=".85"><stop offset="0" stop-color="#fbe9a8"/><stop offset=".55" stop-color="#c99f3e"/><stop offset="1" stop-color="#6e5014"/></radialGradient>
  ${ORNAMENT}
  <linearGradient id="shade" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#000" stop-opacity=".35"/><stop offset=".22" stop-color="#000" stop-opacity="0"/><stop offset=".78" stop-color="#000" stop-opacity="0"/><stop offset="1" stop-color="#000" stop-opacity=".4"/></linearGradient>
  <linearGradient id="gloss" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#fff" stop-opacity=".12"/><stop offset=".4" stop-color="#fff" stop-opacity="0"/></linearGradient>
  <clipPath id="body"><path d="${outline}"/></clipPath>
</defs>
<path d="${outline}" fill="url(#orn)"/>
<g clip-path="url(#body)">${stripes}<rect width="160" height="392" fill="url(#shade)"/><rect width="160" height="392" fill="url(#gloss)"/></g>
<path d="M18 390 L18 78 Q18 18 80 18 Q142 18 142 78 L142 390" fill="none" stroke="#c8202a" stroke-width="9"/>
<path d="M25 390 L25 79 Q25 26 80 26 Q135 26 135 79 L135 390" fill="none" stroke="#d6b04e" stroke-width="3.2" stroke-dasharray="2.2 1.4"/>
<path d="M25 390 L25 79 Q25 26 80 26 Q135 26 135 79 L135 390" fill="none" stroke="#7d5d14" stroke-width=".6" transform="translate(1 1)" opacity=".6"/>
<circle cx="80" cy="60" r="16" fill="url(#btn)" stroke="#5e4510" stroke-width="1.2"/>
<circle cx="80" cy="60" r="10.5" fill="none" stroke="#8a6618" stroke-width="1.1"/>
<path d="M74 60 H86 M80 54 V66" stroke="#8a6618" stroke-width="1.3"/>
${BADGE}
${stars}
</svg>`;
}
