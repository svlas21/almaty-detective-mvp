"use client";

import { useState, type ReactNode } from "react";

export interface InterrogationQuestion {
  q: string;
  a: string;
}

interface InterrogationProtocolProps {
  questions: InterrogationQuestion[];
  /** Рендерится под списком вопросов; получает allViewed (например, кнопка "Открыть карту Алматы" в IntroScreen). */
  footer?: (allViewed: boolean) => ReactNode;
}

export default function InterrogationProtocol({ questions, footer }: InterrogationProtocolProps) {
  const [viewed, setViewed] = useState<Set<number>>(new Set());

  if (questions.length === 0) return null;

  const allViewed = viewed.size === questions.length;

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
