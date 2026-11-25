import { signatureFor } from "@/lib/signature";

/**
 * Подписи, нарисованные от руки (public/signatures/*.png): закреплены за
 * персонажами по id. У кого своей нет — росчерк из lib/signature.ts.
 */
const HANDWRITTEN: Record<string, string> = {
  investigator: "/signatures/investigator.png", // следователь (игрок)
  "d3ddcd6d-4093-5464-970c-de4ad3cb9af1": "/signatures/seitova.png", // Сеитова, криминалист
  "a6c62ec0-5ff9-53a5-b9a2-20898741074b": "/signatures/kan.png", // Кан, судмедэксперт
  "14e9bc6d-22f0-5005-b51c-e0678d8fa225": "/signatures/abishev.png", // Абишев, ИВЦ
  "11b90ca2-3c48-573f-95ac-041cf0635f90": "/signatures/beisenov.png", // Бейсенов, криминолог
  "0e8eb7cc-a947-5525-80eb-0978454d919b": "/signatures/valentina.png", // Валентина Петровна
  "5b4c1ece-ba00-50d6-9113-73e03e05ccd8": "/signatures/farhad.png", // Фархад
  "54b23338-3cf2-5d0a-99c4-91c0de226522": "/signatures/viktor.png", // Виктор Гринько
  "96e916c8-7fd0-5edc-a4fe-1a6aeda231bf": "/signatures/aliya.png", // Алия
  "a7955352-673d-5ff7-bfcc-506079544d1f": "/signatures/daniyar.png", // Данияр Ахметов
  "2d9e7245-2e05-5079-86f1-f9b2edb1f3e9": "/signatures/erlan.png", // Ерлан Нуртазин
  "ea6167fb-4eea-5e08-ae65-e5fce24e6a6c": "/signatures/olzhas.png", // Олжас Бекенов
  "631694f6-0ec1-523d-9f2a-599f875223c1": "/signatures/tamara.png", // Тамара Шнайдер
  "753087d6-7c38-5bf7-889e-3c4477902369": "/signatures/zoya.png", // Зоя Михайловна
  "ad04679a-62fd-52ac-a043-6e04873ad6b3": "/signatures/roza.png", // Роза-апа
};

/** Неизвестные исполнители (справки РОВД, дежурные, операторы) — своя подпись у каждого документа */
const ANON = Array.from({ length: 8 }, (_, i) => `/signatures/anon${i + 1}.png`);
function anonFor(id: string): string {
  let h = 0;
  for (const ch of id) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
  return ANON[h % ANON.length];
}

/** Подпись чернилами над строкой «(подпись)». id — постоянный ключ персонажа. */
export default function Signature({ id, name, className }: { id: string; name?: string | null; className?: string }) {
  const s = signatureFor(id);
  const label = name ? `Подпись: ${name}` : "Подпись";
  const file = HANDWRITTEN[id] ?? (id.startsWith("doc:") || id === "criminalist" ? anonFor(id) : undefined);
  if (file) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={file}
        alt={label}
        className={className ?? "signature"}
        style={{ transform: `rotate(${(s.rotate / 2).toFixed(1)}deg)` }}
        draggable={false}
      />
    );
  }
  return (
    <svg
      className={className ?? "signature"}
      viewBox={`0 0 ${s.width} ${s.height}`}
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label={label}
      style={{ transform: `rotate(${s.rotate.toFixed(1)}deg)`, color: s.color }}
    >
      {s.paths.map((d, i) => (
        <path key={i} d={d} fill="none" stroke="currentColor" strokeWidth={7.5} strokeLinecap="round" strokeLinejoin="round" />
      ))}
    </svg>
  );
}
