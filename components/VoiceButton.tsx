"use client";

import React, { useEffect, useRef, useState } from "react";

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

  useEffect(() => {
    if (!src) return;
    const a = new Audio(src);
    a.preload = "auto";
    audio.current = a;
    const tick = () => {
      const p = a.duration ? a.currentTime / a.duration : 0;
      setProgress(p);
      cb.current?.(p);
    };
    const end = () => { setPlaying(false); setProgress(0); cb.current?.(1); };
    // играет только одна реплика: остальные кнопки встают на паузу
    const other = (e: Event) => { if ((e as CustomEvent).detail !== a && !a.paused) { a.pause(); setPlaying(false); } };
    a.addEventListener("timeupdate", tick);
    a.addEventListener("ended", end);
    window.addEventListener("voice:play", other);
    if (autoPlay) {
      window.dispatchEvent(new CustomEvent("voice:play", { detail: a }));
      setStarted(true);
      a.play().then(() => setPlaying(true)).catch(() => setPlaying(false));
    }
    return () => {
      window.removeEventListener("voice:play", other);
      a.pause();
      a.removeEventListener("timeupdate", tick);
      a.removeEventListener("ended", end);
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
