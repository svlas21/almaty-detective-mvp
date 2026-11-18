import { img } from "@/lib/img";

/**
 * Снимок улики справа от текста. Картинка уже оформлена как лист из дела
 * (фототаблица: лист, скрепка, отпечаток с белым полем) — показываем как есть,
 * только кладём «на стол» с тенью и лёгким наклоном.
 */
export default function EvidencePhoto({ src, caption }: { src: string; caption?: string | null }) {
  return (
    <figure className="ev-photo">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={img(src, { w: 900, q: 80 })} decoding="async" alt={caption ? `Фототаблица: ${caption}` : "Фототаблица"} loading="lazy" />
    </figure>
  );
}
