/**
 * Картинки из Supabase Storage через встроенное ресайз-преобразование:
 * /object/public/... → /render/image/public/...?width=&quality=
 * Старые портреты и карта весят по 1,5–3,5 МБ, а показываются маленькими —
 * так грузится в 10–30 раз меньше. Повторные запросы отдаёт CDN.
 * Ограничение Supabase: ширина не больше 3000 px, поэтому полные 360°-панорамы
 * (4096 px) сюда не пропускаем — их предзагружаем (preloadImage).
 */
const OBJECT = "/storage/v1/object/public/";
const RENDER = "/storage/v1/render/image/public/";

export function img(url: string | null | undefined, opts: { w?: number; q?: number } = {}): string {
  if (!url) return "";
  if (!url.includes(OBJECT)) return url;
  const params = new URLSearchParams();
  if (opts.w) params.set("width", String(Math.min(3000, Math.round(opts.w))));
  params.set("quality", String(opts.q ?? 75));
  // Без resize=contain Supabase при одной ширине режет полосу из середины
  // (портрет 1024×1024 → 200×1024), и в квадратной рамке видны только нос и рот.
  params.set("resize", "contain");
  return url.replace(OBJECT, RENDER) + "?" + params.toString();
}

const preloaded = new Set<string>();
/** Начать загрузку заранее (браузер положит в кэш), без ожидания. */
export function preloadImage(url: string | null | undefined) {
  if (!url || preloaded.has(url) || typeof window === "undefined") return;
  preloaded.add(url);
  const i = new Image();
  i.decoding = "async";
  i.src = url;
}

/** URL панорамы для вьюера: частичные (широкие кадры ≤3000 px) — сжатые, полные 360° — как есть. */
export function panoUrl(url: string | null | undefined, haov: number | null | undefined): string {
  if (!url) return "";
  return haov && haov < 360 ? img(url, { q: 80 }) : url;
}
