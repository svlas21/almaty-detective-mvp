"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";

export interface InterrogationQuestion {
  q: string;
  a: string;
}

interface InterrogationProtocolProps {
  questions: InterrogationQuestion[];
  /** Рендерится под списком вопросов; получает allViewed (например, кнопка "Открыть карту Алматы" в IntroScreen). */
  footer?: (allViewed: boolean) => ReactNode;
  /** Вызывается один раз за монтирование, когда раскрыты все вопросы протокола. */
  onAllViewed?: () => void;
}

export default function InterrogationProtocol({ questions, footer, onAllViewed }: InterrogationProtocolProps) {
  const [viewed, setViewed] = useState<Set<number>>(new Set());
  const firedRef = useRef(false);
  const allViewed = questions.length > 0 && viewed.size === questions.length;

  useEffect(() => {
    if (allViewed && !firedRef.current) {
      firedRef.current = true;
      onAllViewed?.();
    }
  }, [allViewed, onAllViewed]);

  if (questions.length === 0) return null;

  function viewQuestion(i: number) {
    setViewed((prev) => new Set(prev).add(i));
  }

  return (
    <div className="dossier-card">
      <div className="dossier-section-label">Протокол допроса</div>
      {questions.map((qa, i) => (
        <div
          key={i}
          className={`dossier-question-interactive${viewed.has(i) ? " is-viewed" : ""}`}
          onClick={() => viewQuestion(i)}
        >
          <p className="dossier-question-q">{qa.q}</p>
          {viewed.has(i) && <p className="dossier-answer">{qa.a}</p>}
        </div>
      ))}
      {footer?.(allViewed)}
    </div>
  );
}
