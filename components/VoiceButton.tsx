"use client";

import React, { useEffect, useRef, useState } from "react";
import { setVoicePlaying } from "@/lib/sfx";

// Кнопка озвучки реплики: «Послушать» / «Пауза» и тонкая полоска прогресса.
// Звук останавливается, когда кнопка исчезает с экрана.
export default function VoiceButton({
  src,
  label = "Послушать",
  onProgress,
  compact,
  autoPlay,
}: {
  compact?: boolean;
  /** Начать сразу при появлении (только после клика игрока, иначе браузер не даст). */
  autoPlay?: boolean;
  src?: string | null;
  label?: string;
  /** Доля прослушанного 0..1 (0 — не начато или закончилось). */
  onProgress?: (p: number) => void;
}) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [started, setStarted] = useState(false);
  const cb = useRef(onProgress);
  cb.current = onProgress;

  // src может быть несколькими ссылками через пробел — реплики подряд (плейлист).
  useEffect(() => {
    if (!src) return;
    const list = src.split(/\s+/).filter(Boolean).map((u) => {
      const a = new Audio(u);
      a.preload = "auto";
      return a;
    });
    let cur = 0;
    audio.current = list[0];
    // общая доля прослушанного: по длительности частей, пока она неизвестна — поровну
    const total = () => {
      const d = list.map((a) => (isFinite(a.duration) && a.duration > 0 ? a.duration : 0));
      if (d.some((x) => x === 0)) return (cur + (list[cur].duration ? list[cur].currentTime / list[cur].duration : 0)) / list.length;
      const sum = d.reduce((x, y) => x + y, 0);
      const before = d.slice(0, cur).reduce((x, y) => x + y, 0);
      return (before + list[cur].currentTime) / sum;
    };
    const tick = () => {
      const p = total();
      setProgress(p);
      cb.current?.(p);
    };
    const ended = () => {
      if (cur < list.length - 1) {
        cur += 1;
        audio.current = list[cur];
        void list[cur].play().catch(() => setPlaying(false));
        return;
      }
      setPlaying(false);
      setProgress(0);
      cb.current?.(1);
      cur = 0;
      audio.current = list[0];
      list.forEach((a) => (a.currentTime = 0));
    };
    // играет только одна реплика: остальные кнопки встают на паузу
    const other = (e: Event) => {
      if (!list.includes((e as CustomEvent).detail) && !list[cur].paused) {
        list[cur].pause();
        setPlaying(false);
      }
    };
    const offs: (() => void)[] = [];
    for (const a of list) {
      const on = () => setVoicePlaying(a, true);
      const off = () => setVoicePlaying(a, false);
      a.addEventListener("timeupdate", tick);
      a.addEventListener("ended", ended);
      a.addEventListener("play", on);
      a.addEventListener("pause", off);
      a.addEventListener("ended", off);
      offs.push(() => {
        a.pause();
        setVoicePlaying(a, false);
        a.removeEventListener("timeupdate", tick);
        a.removeEventListener("ended", ended);
        a.removeEventListener("play", on);
        a.removeEventListener("pause", off);
        a.removeEventListener("ended", off);
      });
    }
    window.addEventListener("voice:play", other);
    if (autoPlay) {
      window.dispatchEvent(new CustomEvent("voice:play", { detail: list[0] }));
      setStarted(true);
      list[0].play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
    return () => {
      window.removeEventListener("voice:play", other);
      offs.forEach((f) => f());
      audio.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src]);

  if (!src) return null;

  const toggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    const a = audio.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { window.dispatchEvent(new CustomEvent("voice:play", { detail: a })); setStarted(true); a.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }
  };

  return (
    <button type="button" className={`voice-btn${compact ? " voice-btn--sm" : ""}${playing ? " is-playing" : ""}${started ? "" : " is-fresh"}`} onClick={toggle}
      aria-label={playing ? "Пауза" : label}>
      <span className="voice-btn-icon" aria-hidden>{playing ? "❚❚" : "▶"}</span>
      <span>{playing ? "Пауза" : progress > 0 ? "Дальше" : label}</span>
      <span className="voice-btn-bar" style={{ transform: `scaleX(${progress})` }} />
    </button>
  );
}
