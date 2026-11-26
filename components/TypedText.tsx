"use client";

import { useEffect, useRef, useState } from "react";
import RichText from "@/components/RichText";
import { carriage, key } from "@/lib/sfx";

// Тексты, которые уже печатались в этой вкладке: при повторном показе — сразу целиком, без звука.
const SEEN_KEY = "typed-seen";
let seen: Set<string> | null = null;
function hash(t: string): string {
  let h = 5381;
  for (let i = 0; i < t.length; i++) h = ((h << 5) + h + t.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36) + t.length.toString(36);
}
function seenSet(): Set<string> {
  if (seen) return seen;
  try {
    seen = new Set(JSON.parse(window.sessionStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    seen = new Set();
  }
  return seen;
}
function wasSeen(t: string): boolean {
  return typeof window !== "undefined" && seenSet().has(hash(t));
}
function markSeen(t: string) {
  const s = seenSet();
  s.add(hash(t));
  try {
    window.sessionStorage.setItem(SEEN_KEY, JSON.stringify([...s].slice(-500)));
  } catch {
    /* без хранилища — помним до перезагрузки */
  }
}

/**
 * Текст «печатается на машинке»: буквы появляются по одной, со звуком клавиш.
 * Клик по тексту — допечатать сразу. При «уменьшении движения» — без эффекта.
 * Печатается только при первом показе; повторно — сразу целиком и без звука.
 */
export default function TypedText({
  text,
  className,
  speed = 55,
  onDone,
  finishNow,
}: {
  text: string | null | undefined;
  className?: string;
  speed?: number;
  /** Вызывается, когда текст допечатан (в том числе по клику). */
  onDone?: () => void;
  /** true — допечатать сразу (например, игрок нажал «Слушать»). */
  finishNow?: boolean;
}) {
  const full = text ?? "";
  const [n, setN] = useState(() => (full && wasSeen(full) ? full.length : 0));
  const done = n >= full.length;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);
  const doneCb = useRef(onDone);
  doneCb.current = onDone;

  useEffect(() => {
    if (done && full.length > 0) doneCb.current?.();
  }, [done, full]);

  useEffect(() => {
    if (finishNow) {
      if (timer.current) clearInterval(timer.current);
      setN(full.length);
    }
  }, [finishNow, full]);

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce || !full || wasSeen(full)) {
      setN(full.length);
      return;
    }
    markSeen(full);
    setN(0);
    let i = 0;
    const step = Math.max(1, Math.round(speed / 30)); // букв за тик (тик ~33 мс)
    timer.current = setInterval(() => {
      const prev = i;
      i = Math.min(full.length, i + step);
      const chunk = full.slice(prev, i);
      if (/\n/.test(chunk)) carriage();
      else if (/\S/.test(chunk) && Math.random() < 0.85) key();
      setN(i);
      if (i >= full.length && timer.current) clearInterval(timer.current);
    }, 33);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [full, speed]);

  function finish() {
    if (timer.current) clearInterval(timer.current);
    setN(full.length);
  }

  return (
    <div className={done ? "typed-text" : "typed-text is-typing"} onClick={done ? undefined : finish} title={done ? undefined : "Нажмите, чтобы допечатать"}>
      <RichText text={done ? full : full.slice(0, n)} className={className} />
    </div>
  );
}
