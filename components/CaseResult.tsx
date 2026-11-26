"use client";

import { useEffect, useRef, useState } from "react";
import { attemptsLabel, formatTerm, type CaseResult as Result } from "@/lib/caseResult";
import { stamp } from "@/lib/sfx";

/**
 * Итог раскрытого дела: аттестация (счёт, звание, срок следствия) и карточка «Поделиться».
 * Карточка рисуется на canvas — та же картинка и показывается, и скачивается, и уходит в «Поделиться».
 * На карточке только цифры и звание: ни имён, ни ответов, чтобы не испортить игру друзьям.
 */
type Data = Result & { caseTitle: string | null };

const W = 1080;
const H = 1350;

function caseNumber(title: string | null) {
  return title?.match(/№\s*(\d+)/)?.[1] ?? "9704";
}
function caseName(title: string | null) {
  return title?.match(/«([^»]+)»/)?.[1] ?? "Угоревший";
}
function starsText(n: number) {
  return "★".repeat(n) + "☆".repeat(5 - n);
}

function loadImg(src: string): Promise<HTMLImageElement | null> {
  return new Promise((res) => {
    const i = new Image();
    i.onload = () => res(i);
    i.onerror = () => res(null);
    i.src = src;
  });
}

function fontVar(name: string, fallback: string) {
  if (typeof window === "undefined") return fallback;
  const v = getComputedStyle(document.body).getPropertyValue(name).trim();
  return v ? `${v}, ${fallback}` : fallback;
}

async function drawCard(d: Data): Promise<HTMLCanvasElement> {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  try {
    await document.fonts?.ready;
  } catch {
    /* без шрифтов — запасные */
  }
  const serif = fontVar("--font-pt-serif", "Georgia, serif");
  const mono = fontVar("--font-pt-mono", "Courier New, monospace");
  const ink = "#2a2318";
  const soft = "#6a604c";
  const red = "#9c2b1f";

  // фон: тёмный стол и лист бумаги
  g.fillStyle = "#14110c";
  g.fillRect(0, 0, W, H);
  const px = 70, py = 70, pw = W - 140, ph = H - 140;
  g.fillStyle = "#e9e0c9";
  g.fillRect(px, py, pw, ph);
  // лёгкое «зерно» бумаги
  for (let i = 0; i < 2600; i++) {
    g.fillStyle = `rgba(90,70,40,${Math.random() * 0.05})`;
    g.fillRect(px + Math.random() * pw, py + Math.random() * ph, 2, 2);
  }
  // двойная рамка бланка
  g.strokeStyle = ink;
  g.lineWidth = 3;
  g.strokeRect(px + 34, py + 34, pw - 68, ph - 68);
  g.lineWidth = 1;
  g.strokeRect(px + 44, py + 44, pw - 88, ph - 88);

  const cx = W / 2;
  g.textAlign = "center";
  g.fillStyle = soft;
  g.font = `26px ${mono}`;
  g.fillText("ГУВД Г. АЛМАТЫ · УГОЛОВНЫЙ РОЗЫСК", cx, py + 120);
  g.fillText("1996", cx, py + 156);

  g.fillStyle = ink;
  g.font = `30px ${mono}`;
  g.fillText(`ДЕЛО № ${caseNumber(d.caseTitle)}`, cx, py + 240);
  g.font = `bold 78px ${serif}`;
  g.fillText(`«${caseName(d.caseTitle)}»`, cx, py + 330);

  // разделитель
  g.strokeStyle = soft;
  g.setLineDash([6, 8]);
  g.beginPath();
  g.moveTo(px + 120, py + 385);
  g.lineTo(px + pw - 120, py + 385);
  g.stroke();
  g.setLineDash([]);

  // счёт
  g.fillStyle = ink;
  g.font = `bold 230px ${serif}`;
  g.fillText(String(d.score), cx - 90, py + 610);
  const numW = g.measureText(String(d.score)).width;
  g.textAlign = "left";
  g.fillStyle = soft;
  g.font = `40px ${serif}`;
  g.fillText("из 100", cx - 90 + numW / 2 + 16, py + 610);

  // звание
  g.textAlign = "center";
  g.fillStyle = "#a97530";
  g.font = `54px ${serif}`;
  g.fillText(starsText(d.stars), cx, py + 700);
  g.fillStyle = ink;
  g.font = `bold 50px ${serif}`;
  g.fillText(d.rank, cx, py + 770);

  // цифры следствия 2×2
  const s = d.stats;
  const cells: [string, string][] = [
    ["СРОК СЛЕДСТВИЯ", formatTerm(s.gameMinutes)],
    ["ВЫЕЗДОВ", `${s.trips} · эталон ${s.refTrips}`],
    ["ОБВИНЕНИЕ", attemptsLabel(s.organizerAttempts)],
    ["УЛИК В ДЕЛЕ", `${s.evidenceFound} из ${s.evidenceTotal}`],
  ];
  const gx = px + 110, gy = py + 800, cw = (pw - 220) / 2, ch = 100;
  cells.forEach(([k, v], i) => {
    const x = gx + (i % 2) * cw;
    const y = gy + Math.floor(i / 2) * ch;
    g.textAlign = "left";
    g.fillStyle = soft;
    g.font = `22px ${mono}`;
    g.fillText(k, x + 20, y + 30);
    g.fillStyle = ink;
    g.font = `bold 36px ${serif}`;
    g.fillText(v, x + 20, y + 76);
  });

  // подпись следователя — справа внизу
  const sig = await loadImg("/signatures/investigator.png");
  const lx = px + pw - 440, ly = py + 1080;
  g.strokeStyle = ink;
  g.lineWidth = 1.5;
  g.beginPath();
  g.moveTo(lx, ly);
  g.lineTo(lx + 300, ly);
  g.stroke();
  if (sig) {
    const sh = 90, sw2 = Math.min((sig.width / sig.height) * sh, 260);
    g.globalAlpha = 0.85;
    g.drawImage(sig, lx + 20, ly - sh + 18, sw2, sh);
    g.globalAlpha = 1;
  }
  g.fillStyle = soft;
  g.font = `22px ${mono}`;
  g.textAlign = "left";
  g.fillText("СЛЕДОВАТЕЛЬ", lx, ly + 32);

  // печать с гербом и штамп «РАСКРЫТО» — у счёта, справа
  const emblem = await loadImg("/stamps/emblem.png");
  g.save();
  g.translate(px + pw - 205, py + 495);
  g.rotate(-0.18);
  g.globalAlpha = 0.72;
  if (emblem) g.drawImage(emblem, -105, -105, 210, 210);
  g.globalAlpha = 0.85;
  g.strokeStyle = red;
  g.lineWidth = 6;
  g.strokeRect(-150, -34, 300, 68);
  g.fillStyle = red;
  g.font = `bold 44px ${mono}`;
  g.textAlign = "center";
  g.fillText("РАСКРЫТО", 0, 17);
  g.restore();

  // низ
  g.fillStyle = soft;
  g.textAlign = "center";
  g.font = `26px ${serif}`;
  g.fillText("Детектив Алматы · раскроете быстрее?", cx, py + ph - 62);
  return c;
}

function shareText(d: Data, url: string) {
  return `Раскрыл дело № ${caseNumber(d.caseTitle)} «${caseName(d.caseTitle)}» в «Детективе Алматы»: ${d.score} из 100, звание — ${d.rank}. Срок следствия ${formatTerm(d.stats.gameMinutes)}. Раскроете быстрее? ${url}`;
}

export default function CaseResult({ sessionId }: { sessionId: string }) {
  const [data, setData] = useState<Data | null>(null);
  const [img, setImg] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const blobRef = useRef<Blob | null>(null);

  useEffect(() => {
    let alive = true;
    fetch(`/api/games/${sessionId}/result`)
      .then((r) => (r.ok ? r.json() : null))
      .then(async (d: Data | null) => {
        if (!alive || !d) return;
        setData(d);
        setTimeout(() => stamp(), 350);
        const c = await drawCard(d);
        c.toBlob((b) => {
          if (!alive || !b) return;
          blobRef.current = b;
          setImg(URL.createObjectURL(b));
        }, "image/png");
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [sessionId]);

  if (!data) return null;
  const url = typeof window !== "undefined" ? window.location.origin : "";
  const text = shareText(data, url);
  const file = () => (blobRef.current ? new File([blobRef.current], `delo-${caseNumber(data.caseTitle)}.png`, { type: "image/png" }) : null);

  async function share() {
    const f = file();
    try {
      if (f && navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], text });
      else if (navigator.share) await navigator.share({ text, url });
      else await copy();
    } catch {
      /* игрок закрыл окно — ничего страшного */
    }
  }
  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      /* буфер недоступен */
    }
  }
  function download() {
    if (!img) return;
    const a = document.createElement("a");
    a.href = img;
    a.download = `delo-${caseNumber(data!.caseTitle)}.png`;
    a.click();
  }

  const s = data.stats;
  return (
    <section className="case-result" aria-label="Итог следствия">
      <div className="cr-attest">
        <div className="cr-kicker">Аттестация по делу</div>
        <div className="cr-main">
          <div className="cr-score">
            <span className="cr-score-n">{data.score}</span>
            <span className="cr-score-of">из 100</span>
          </div>
          <div className="cr-rank">
            <span className="cr-stars" aria-label={`${data.stars} из 5`}>{starsText(data.stars)}</span>
            <span className="cr-rank-title">{data.rank}</span>
          </div>
        </div>
        <dl className="cr-stats">
          <div><dt>Срок следствия</dt><dd>{formatTerm(s.gameMinutes)}</dd></div>
          <div><dt>Выездов</dt><dd>{s.trips} <small>· эталон {s.refTrips}</small></dd></div>
          <div><dt>Обвинение</dt><dd>{attemptsLabel(s.organizerAttempts)}</dd></div>
          <div><dt>Улик в деле</dt><dd>{s.evidenceFound} <small>из {s.evidenceTotal}</small></dd></div>
        </dl>
        <div className="cr-parts">
          {data.parts.map((p) => (
            <div key={p.label} className="cr-part">
              <span className="cr-part-label">{p.label}</span>
              <span className="cr-part-bar"><span style={{ width: `${(100 * p.points) / p.max}%` }} /></span>
              <span className="cr-part-n">{p.points}<small>/{p.max}</small></span>
            </div>
          ))}
        </div>
      </div>

      <div className="cr-share">
        <div className="cr-card">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={`Карточка: дело раскрыто, ${data.score} из 100, ${data.rank}`} />
          ) : (
            <div className="cr-card-wait">Печатаем карточку…</div>
          )}
        </div>
        <div className="cr-share-side">
          <h3>Поделиться результатом</h3>
          <p>На карточке только цифры и звание — ни имён, ни разгадки. Друзьям не испортите.</p>
          <div className="cr-btns">
            <button className="cr-btn is-main" onClick={share}>Поделиться</button>
            <a className="cr-btn" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">WhatsApp</a>
            <a className="cr-btn" href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">Telegram</a>
            <button className="cr-btn" onClick={download} disabled={!img}>Скачать картинку</button>
            <button className="cr-btn" onClick={copy}>{copied ? "Скопировано" : "Скопировать текст"}</button>
          </div>
        </div>
      </div>
    </section>
  );
}
