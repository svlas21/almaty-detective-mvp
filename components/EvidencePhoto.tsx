import { tp } from "@/components/RichText";

/**
 * Единая рамка для снимка улики: лист из уголовного дела, фото на белом поле,
 * скрепка, уголки клея, подпись машинкой. Сам снимок приводится к ч/б с сепией
 * фильтром — любая картинка выглядит как отпечаток из фототаблицы ЭКО.
 */
export default function EvidencePhoto({ src, caption }: { src: string; caption?: string | null }) {
  return (
    <figure className="ev-photo" aria-label={caption ?? "Снимок улики"}>
      <span className="ev-photo-clip" aria-hidden />
      <div className="ev-photo-print">
        <span className="ev-photo-glue is-tl" aria-hidden />
        <span className="ev-photo-glue is-tr" aria-hidden />
        <span className="ev-photo-glue is-bl" aria-hidden />
        <span className="ev-photo-glue is-br" aria-hidden />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={src} alt={caption ?? ""} loading="lazy" />
      </div>
      <figcaption>
        <span>Фототаблица к протоколу осмотра</span>
        {caption && <strong>{tp(caption)}</strong>}
      </figcaption>
    </figure>
  );
}
