"use client";

import { useEffect, useRef, useState } from "react";
import { attemptsLabel, formatTerm, type CaseResult as Result } from "@/lib/caseResult";
import { gameDate, MONTHS_GEN } from "@/lib/gameClock";
import { stamp } from "@/lib/sfx";

/**
 * Итог раскрытого дела — приказ о присвоении звания и погон.
 * Погон — главный образ (картинки public/epaulettes/rank-1…5.webp): звание читается по звёздам и просветам.
 * Карточка «Поделиться» рисуется на canvas из тех же элементов; имён и разгадки на ней нет.
 */
type Data = Result & { caseTitle: string | null };

const W = 1080;
const H = 1350;
const C = { cloth: "#1f242b", paper: "#e6dcc3", ink: "#23201b", soft: "#6b624f", gold: "#c9a24a", red: "#a3242a" };

const caseNumber = (t: string | null) => t?.match(/№\s*(\d+)/)?.[1] ?? "9704";
const caseName = (t: string | null) => t?.match(/«([^»]+)»/)?.[1] ?? "Угоревший";
function orderDate(min: number) {
  const d = gameDate(min);
  return `${d.getDate()} ${MONTHS_GEN[d.getMonth()]} ${d.getFullYear()} г.`;
}
/** Погон по ступени звания (1 лейтенант … 5 полковник), public/epaulettes. */
const epUrl = (level: number) => `/epaulettes/rank-${Math.min(5, Math.max(1, level))}.webp`;
function ledger(d: Data) {
  const s = d.stats;
  const [o, a, t, e] = d.parts;
  return [
    { label: "Обвинение организатору", note: attemptsLabel(s.organizerAttempts), p: o },
    { label: "Роли соучастников", note: attemptsLabel(s.accompliceAttempts), p: a },
    { label: "Выезды", note: `${s.trips} при плане ${s.refTrips}`, p: t },
    { label: "Улики", note: `${s.evidenceFound} из ${s.evidenceTotal}`, p: e },
  ];
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
  const v = getComputedStyle(document.body).getPropertyValue(name).trim();
  return v ? `${v}, ${fallback}` : fallback;
}
function wrap(g: CanvasRenderingContext2D, text: string, maxW: number): string[] {
  const out: string[] = [];
  let line = "";
  for (const w of text.split(" ")) {
    const t = line ? `${line} ${w}` : w;
    if (g.measureText(t).width > maxW && line) {
      out.push(line);
      line = w;
    } else line = t;
  }
  if (line) out.push(line);
  return out;
}
/** Штамп «РАСКРЫТО» с потёртостями. */
function stampCanvas(font: string): HTMLCanvasElement {
  const s = document.createElement("canvas");
  s.width = 460;
  s.height = 130;
  const g = s.getContext("2d")!;
  g.strokeStyle = C.red;
  g.fillStyle = C.red;
  g.lineWidth = 8;
  g.strokeRect(8, 8, 444, 114);
  g.lineWidth = 3;
  g.strokeRect(20, 20, 420, 90);
  g.font = `bold 66px ${font}`;
  g.textAlign = "center";
  g.textBaseline = "middle";
  g.fillText("РАСКРЫТО", 230, 68);
  g.globalCompositeOperation = "destination-out";
  for (let i = 0; i < 900; i++) {
    g.globalAlpha = Math.random() * 0.9;
    g.beginPath();
    g.arc(Math.random() * 460, Math.random() * 130, Math.random() * 2.4, 0, Math.PI * 2);
    g.fill();
  }
  return s;
}

async function drawCard(d: Data): Promise<HTMLCanvasElement> {
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const g = c.getContext("2d")!;
  try {
    await document.fonts?.ready;
  } catch {
    /* запасные шрифты */
  }
  const serif = fontVar("--font-pt-serif", "Georgia, serif");
  const mono = fontVar("--font-pt-mono", "Courier New, monospace");

  // сукно шинели
  g.fillStyle = C.cloth;
  g.fillRect(0, 0, W, H);
  g.save();
  g.globalAlpha = 0.05;
  g.strokeStyle = "#ffffff";
  for (let x = -H; x < W; x += 7) {
    g.beginPath();
    g.moveTo(x, 0);
    g.lineTo(x + H, H);
    g.stroke();
  }
  g.restore();
  const vg = g.createRadialGradient(W * 0.35, H * 0.3, 100, W * 0.5, H * 0.5, 900);
  vg.addColorStop(0, "rgba(255,255,255,0.05)");
  vg.addColorStop(1, "rgba(0,0,0,0.55)");
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);

  // дело
  g.textAlign = "left";
  g.fillStyle = "rgba(230,220,195,.7)";
  g.font = `30px ${mono}`;
  g.fillText(`Дело № ${caseNumber(d.caseTitle)}`, 90, 120);
  g.fillStyle = C.paper;
  g.font = `bold 64px ${serif}`;
  g.fillText(`«${caseName(d.caseTitle)}»`, 90, 192);

  // погон
  const ep = await loadImg(epUrl(d.stars));
  if (ep) {
    const eh = 640, ew = (ep.width / ep.height) * eh;
    const board = (x: number, y: number, rot: number) => {
      g.save();
      g.shadowColor = "rgba(0,0,0,.65)";
      g.shadowBlur = 36;
      g.shadowOffsetY = 18;
      g.translate(x + ew / 2, y + eh / 2);
      g.rotate(rot);
      g.drawImage(ep, -ew / 2, -eh / 2, ew, eh);
      g.restore();
    };
    board(70, 270, -0.09);
    board(215, 250, 0.07);
  }

  // звание и оценка
  g.fillStyle = C.gold;
  g.font = `28px ${mono}`;
  g.fillText("присвоено звание", 470, 360);
  g.fillStyle = C.paper;
  g.font = `bold 76px ${serif}`;
  wrap(g, d.rank, 520).forEach((l, i) => g.fillText(l, 470, 450 + i * 84));
  g.fillStyle = C.gold;
  g.font = `bold 200px ${serif}`;
  g.fillText(String(d.score), 462, 800);
  const sw = g.measureText(String(d.score)).width;
  g.fillStyle = "rgba(230,220,195,.6)";
  g.font = `44px ${serif}`;
  g.fillText("из 100", 470 + sw + 8, 800);

  // полоска приказа
  g.save();
  g.translate(W / 2, 1075);
  g.rotate(-0.018);
  g.shadowColor = "rgba(0,0,0,.5)";
  g.shadowBlur = 30;
  g.shadowOffsetY = 12;
  g.fillStyle = C.paper;
  g.fillRect(-450, -150, 900, 290);
  g.shadowColor = "transparent";
  g.fillStyle = C.ink;
  g.font = `bold 30px ${mono}`;
  g.fillText(`Приказ № ${caseNumber(d.caseTitle)}-лс`, -400, -88);
  g.fillStyle = C.soft;
  g.font = `24px ${mono}`;
  g.textAlign = "right";
  g.fillText(orderDate(d.stats.gameMinutes), 400, -88);
  g.textAlign = "left";
  g.fillStyle = C.ink;
  g.font = `26px ${mono}`;
  const s = d.stats;
  [
    `Срок следствия: ${formatTerm(s.gameMinutes)}.`,
    `Выездов: ${s.trips} при плане ${s.refTrips}.`,
    `Обвинение предъявлено ${attemptsLabel(s.organizerAttempts)}.`,
    `Улик приобщено: ${s.evidenceFound} из ${s.evidenceTotal}.`,
  ].forEach((l, i) => g.fillText(l, -400, -36 + i * 40));
  const st = stampCanvas(mono);
  g.translate(270, 85);
  g.rotate(-0.16);
  g.globalAlpha = 0.85;
  g.drawImage(st, -150, -42, 300, 85);
  g.restore();

  g.fillStyle = "rgba(230,220,195,.55)";
  g.textAlign = "center";
  g.font = `28px ${serif}`;
  g.fillText("Детектив Алматы. Раскроете быстрее?", W / 2, H - 60);
  return c;
}

function shareText(d: Data, url: string) {
  return `Раскрыл дело № ${caseNumber(d.caseTitle)} «${caseName(d.caseTitle)}» в «Детективе Алматы» и получил звание «${d.rank}»: ${d.score} из 100. Раскроете быстрее? ${url}`;
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
        // погон ложится на сукно, затем печать на приказ
        setTimeout(() => stamp(), 1500);
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
  const fileName = `delo-${caseNumber(data.caseTitle)}.png`;

  async function share() {
    const f = blobRef.current ? new File([blobRef.current], fileName, { type: "image/png" }) : null;
    try {
      if (f && navigator.canShare?.({ files: [f] })) await navigator.share({ files: [f], text });
      else if (navigator.share) await navigator.share({ text, url });
      else await copy();
    } catch {
      /* окно закрыли */
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
    a.download = fileName;
    a.click();
  }

  const s = data.stats;
  return (
    <section className="order" aria-label="Итог следствия">
      <div className="order-sheet">
        <div className="order-cloth" aria-hidden="true">
          {/* пара погон, как в комплекте */}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="order-ep is-left" src={epUrl(data.stars)} alt="" />
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="order-ep is-right" src={epUrl(data.stars)} alt="" />
        </div>

        <div className="order-paper">
          <div className="order-blank">
            <p lang="kk">
              Қазақстан Республикасы
              <br />
              Ішкі істер министрлігі
              <br />
              Алматы қаласы Ішкі істер бас басқармасы
            </p>
            <p>
              Министерство внутренних дел
              <br />
              Республики Казахстан
              <br />
              ГУВД г. Алматы
            </p>
          </div>

          <h2 className="order-title">Приказ</h2>
          <div className="order-meta">
            <span>{orderDate(s.gameMinutes)}</span>
            <span>№ {caseNumber(data.caseTitle)}-лс</span>
            <span>г. Алматы</span>
          </div>
          <p className="order-subject">О присвоении специального звания</p>

          <p className="order-body">
            За раскрытие уголовного дела № {caseNumber(data.caseTitle)} «{caseName(data.caseTitle)}»
          </p>
          <p className="order-decree">Приказываю:</p>
          <ol className="order-points">
            <li>
              Присвоить следователю специальное звание
              <span className="order-rank">{data.rank}</span>
            </li>
            <li>
              Основание — оценка работы по делу: <b className="order-score">{data.score}</b> из 100, в том числе:
              <ul className="order-ledger">
                {ledger(data).map((r) => (
                  <li key={r.label}>
                    <span className="ol-label">
                      {r.label}
                      <small>{r.note}</small>
                    </span>
                    <span className="ol-dots" aria-hidden="true" />
                    <span className="ol-pts">
                      {r.p.points} из {r.p.max}
                    </span>
                  </li>
                ))}
              </ul>
            </li>
            <li>Срок следствия по делу: {formatTerm(s.gameMinutes)}.</li>
          </ol>

          <div className="order-sign">
            <span className="order-sign-who">
              Начальник ГУВД г. Алматы
              <br />
              генерал-майор милиции
            </span>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img className="order-sig" src="/signatures/anon1.png" alt="" />
            <span className="order-stamp">Раскрыто</span>
          </div>
        </div>
      </div>

      <div className="order-share">
        <div className="order-card">
          {img ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={img} alt={`Карточка: ${data.rank}, ${data.score} из 100`} />
          ) : (
            <div className="order-card-wait">Готовим карточку</div>
          )}
        </div>
        <div className="order-share-side">
          <h3>Похвастаться погонами</h3>
          <p>На карточке звание и цифры следствия. Имён и разгадки нет, друзьям ничего не испортите.</p>
          <div className="order-btns">
            <button className="ob is-main" onClick={share}>Поделиться</button>
            <a className="ob" href={`https://wa.me/?text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">WhatsApp</a>
            <a className="ob" href={`https://t.me/share/url?url=${encodeURIComponent(url)}&text=${encodeURIComponent(text)}`} target="_blank" rel="noreferrer">Telegram</a>
            <button className="ob" onClick={download} disabled={!img}>Скачать картинку</button>
            <button className="ob" onClick={copy}>{copied ? "Текст скопирован" : "Скопировать текст"}</button>
          </div>
        </div>
      </div>
    </section>
  );
}
