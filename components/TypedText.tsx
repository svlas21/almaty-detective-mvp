"use client";

import { useEffect, useRef, useState } from "react";
import RichText from "@/components/RichText";
import { carriage, key } from "@/lib/sfx";

/**
 * Текст «печатается на машинке»: буквы появляются по одной, со звуком клавиш.
 * Клик по тексту — допечатать сразу. При «уменьшении движения» — без эффекта.
 */
export default function TypedText({ text, className, speed = 55 }: { text: string | null | undefined; className?: string; speed?: number }) {
  const full = text ?? "";
  const [n, setN] = useState(0);
  const done = n >= full.length;
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    if (reduce) {
      setN(full.length);
      return;
    }
    setN(0);
    let i = 0;
    const step = Math.max(1, Math.round(speed / 30)); // букв за тик (тик ~33 мс)
    timer.current = setInterval(() => {
      const prev = i;
      i = Math.min(full.length, i + step);
      const chunk = full.slice(prev, i);
      if (/\n/.test(chunk)) carriage();
      else if (/\S/.test(chunk) && Math.random() < 0.7) key();
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
