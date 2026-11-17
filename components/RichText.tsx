import type { ElementType } from "react";

/**
 * Вывод сценарных текстов (брифинг, ответы, реакции, улики, эпилог).
 *
 * Формат текста в БД:
 *  - пустая строка — граница абзаца/сцены;
 *  - строка с «— » — реплика; следующие строки без тире в том же абзаце —
 *    продолжение той же реплики;
 *  - строки до первой реплики в абзаце — авторская ремарка/документ.
 *
 * Если в тексте есть реплики, ремарки выводятся приглушённо (как ремарка
 * в сценарии). Если реплик нет (улика, документ), все строки — обычный текст.
 */

const NBSP = " ";

const SHORT_WORDS =
  "в|во|к|ко|с|со|у|о|об|обо|и|а|я|на|по|за|из|от|до|не|ни|но|же|ли|бы|из-за|при|без|для|под|над|про|что|как|он|мы|вы|ты|оно|она|они|его|её|их|это|то|там|тут|уже|ещё|вот|да|нет";
const SHORT_RE = new RegExp(`(^|[\\s(«„"])(${SHORT_WORDS})\\s+`, "giu");

export function typograf(s: string): string {
  let t = s.replace(/\r/g, "");
  // дефис/короткое тире между словами → длинное тире
  t = t.replace(/(\S) [-–] /g, `$1 — `);
  t = t.replace(/^[-–] /gm, "— ");
  // тире не уезжает в начало следующей строки
  t = t.replace(/ — /g, `${NBSP}— `);
  // короткие слова держатся за следующее (дважды — для цепочек «и в»)
  t = t.replace(SHORT_RE, `$1$2${NBSP}`).replace(SHORT_RE, `$1$2${NBSP}`);
  // № 9704, г. Алматы, т. е., 49 л., 1996 года, 17:30 часов
  t = t.replace(/№\s+/g, `№${NBSP}`);
  t = t.replace(/(^|[\s(])(г|ул|пр|д|кв|т|им|тыс|руб)\.\s+/giu, `$1$2.${NBSP}`);
  t = t.replace(/(\d)\s+(?=(г\.|гг\.|года?|лет|л\.|руб|тенге|тыс|час|мин|км|см|кг|долл|\$))/giu, `$1${NBSP}`);
  // многоточие
  t = t.replace(/\.\.\./g, "…");
  return t;
}

/** Типографика для коротких строк (имена, роли, заголовки, вопросы, кнопки). */
export function tp(s: string | null | undefined): string {
  return s ? typograf(s) : "";
}

type Line = { kind: "speech" | "cont" | "narr"; text: string };
type Block = Line[];

// Сокращения, после точки которых предложение НЕ кончается: «г. Алматы», «т. е.», «Ф. Мамаджанов».
const ABBR = new Set(["г", "гг", "ул", "пр", "д", "кв", "т", "е", "им", "тыс", "руб", "ст", "см", "л", "р", "с", "п", "п-т", "мкр"]);

/** Делит текст на предложения, не ломая сокращения и инициалы. */
function splitSentences(text: string): string[] {
  const out: string[] = [];
  let start = 0;
  const re = /([.!?…])(["»”)]*)\s+(?=[—–«"А-ЯЁA-Z0-9])/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(text))) {
    const end = m.index + m[1].length + m[2].length;
    const before = text.slice(start, m.index);
    const lastWord = (before.match(/([А-ЯЁа-яёA-Za-z-]+)$/) || [""])[0];
    // «Ф.» (инициал) или «г.» (сокращение) — не конец предложения
    if (m[1] === "." && (lastWord.length === 1 || ABBR.has(lastWord.toLowerCase()))) continue;
    out.push(text.slice(start, end).trim());
    start = re.lastIndex;
  }
  const tail = text.slice(start).trim();
  if (tail) out.push(tail);
  return out;
}

/**
 * Длинный абзац (сплошная реплика или описание) режем на короткие куски
 * по 1–2 предложения: так читается легче, в духе рубленой речи сценария.
 */
const LONG = 170;
const CHUNK = 120;
function chunk(text: string): string[] {
  if (text.length <= LONG) return [text];
  const parts: string[] = [];
  let cur = "";
  for (const s of splitSentences(text)) {
    if (cur && (cur + " " + s).length > CHUNK) {
      parts.push(cur);
      cur = s;
    } else {
      cur = cur ? cur + " " + s : s;
    }
  }
  if (cur) parts.push(cur);
  return parts;
}

function parse(text: string): { blocks: Block[]; hasSpeech: boolean } {
  const blocks: Block[] = [];
  let hasSpeech = false;
  for (const rawBlock of text.replace(/\r/g, "").split(/\n\s*\n/)) {
    const lines = rawBlock
      .split("\n")
      .map((l) => l.trim())
      .filter(Boolean);
    if (lines.length === 0) continue;
    const block: Block = [];
    let inSpeech = false;
    for (const l of lines) {
      if (/^[—–-]\s/.test(l)) {
        inSpeech = true;
        hasSpeech = true;
        chunk(l.replace(/^[—–-]\s+/, "")).forEach((t, i) =>
          block.push({ kind: i === 0 ? "speech" : "cont", text: t })
        );
      } else {
        const kind = inSpeech ? "cont" : "narr";
        chunk(l).forEach((t) => block.push({ kind, text: t }));
      }
    }
    blocks.push(block);
  }
  return { blocks, hasSpeech };
}

// «Первые: …», «Справка: …», «Заключение эксперта: …» — короткая подпись перед
// двоеточием в начале строки. В машинописи её выделяют разрядкой (.rt-label).
const LABEL_RE = /^([^:—«»"\n]{2,32}?):\s+(.*)$/;

function renderLine(line: Line) {
  if (line.kind !== "speech") {
    const m = line.text.match(LABEL_RE);
    // подпись — 1–2 слова с заглавной: «Первые:», «Справка:», «Заключение эксперта:»
    if (m && m[1].trim().split(/\s+/).length <= 2 && /^[А-ЯЁA-Z]/.test(m[1].trim())) {
      return (
        <>
          <span className="rt-label">{typograf(m[1])}:</span> {typograf(m[2])}
        </>
      );
    }
  }
  return typograf(line.text);
}

interface RichTextProps {
  text: string | null | undefined;
  className?: string;
  as?: ElementType;
}

export default function RichText({ text, className, as: Tag = "div" }: RichTextProps) {
  if (!text) return null;
  const { blocks, hasSpeech } = parse(text);
  const mode = hasSpeech ? "rt--dialogue" : "rt--plain";
  return (
    <Tag className={`rt ${mode}${className ? " " + className : ""}`} lang="ru">
      {blocks.map((block, bi) => (
        <div className="rt-block" key={bi}>
          {block.map((line, li) => (
            <p className={`rt-line rt-${line.kind}`} key={li}>
              {line.kind === "speech" && <span className="rt-dash">—{NBSP}</span>}
              {renderLine(line)}
            </p>
          ))}
        </div>
      ))}
    </Tag>
  );
}
