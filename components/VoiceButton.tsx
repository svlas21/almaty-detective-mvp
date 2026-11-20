"use client";

import { useEffect, useRef, useState } from "react";

// Кнопка озвучки реплики: «Послушать» / «Пауза» и тонкая полоска прогресса.
// Звук останавливается, когда кнопка исчезает с экрана.
export default function VoiceButton({ src, label = "Послушать" }: { src?: string | null; label?: string }) {
  const audio = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (!src) return;
    const a = new Audio(src);
    a.preload = "auto";
    audio.current = a;
    const tick = () => setProgress(a.duration ? a.currentTime / a.duration : 0);
    const end = () => { setPlaying(false); setProgress(0); };
    a.addEventListener("timeupdate", tick);
    a.addEventListener("ended", end);
    return () => {
      a.pause();
      a.removeEventListener("timeupdate", tick);
      a.removeEventListener("ended", end);
      audio.current = null;
    };
  }, [src]);

  if (!src) return null;

  const toggle = () => {
    const a = audio.current;
    if (!a) return;
    if (playing) { a.pause(); setPlaying(false); }
    else { a.play().then(() => setPlaying(true)).catch(() => setPlaying(false)); }
  };

  return (
    <button type="button" className={`voice-btn${playing ? " is-playing" : ""}`} onClick={toggle}
      aria-label={playing ? "Пауза" : label}>
      <span className="voice-btn-icon" aria-hidden>{playing ? "❚❚" : "▶"}</span>
      <span>{playing ? "Пауза" : progress > 0 ? "Дальше" : label}</span>
      <span className="voice-btn-bar" style={{ transform: `scaleX(${progress})` }} />
    </button>
  );
}
