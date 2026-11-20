"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import RichText, { tp } from "@/components/RichText";

export interface InterrogationQuestion {
  q: string;
  a: string;
  /** Индекс вопроса в полном протоколе (до скрытия вопросов с условием) — по нему сервер выдаёт улики. */
  idx?: number;
}

interface InterrogationProtocolProps {
  questions: InterrogationQuestion[];
  /** Заголовок секции. По умолчанию «Протокол допроса»; у шефа — разговор, а не допрос. */
  title?: string;
  /** Рендерится под списком вопросов; получает allViewed (например, кнопка "Допросить подозреваемых" в IntroScreen). */
  footer?: (allViewed: boolean) => ReactNode;
  /** Вызывается один раз за монтирование, когда раскрыты все вопросы протокола. */
  onAllViewed?: () => void;
  /** Вызывается один раз за монтирование для КАЖДОГО вопроса при его первом раскрытии. */
  onQuestionViewed?: (index: number) => void;
}

export default function InterrogationProtocol({
  questions,
  title = "Протокол допроса",
  footer,
  onAllViewed,
  onQuestionViewed,
}: InterrogationProtocolProps) {
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
    setViewed((prev) => {
      if (prev.has(i)) return prev;
      onQuestionViewed?.(questions[i]?.idx ?? i);
      return new Set(prev).add(i);
    });
  }

  return (
    <div className="dossier-card">
      <div className="dossier-section-label">{title}</div>
      {questions.map((qa, i) => (
        <div
          key={i}
          className={`dossier-question-interactive${viewed.has(i) ? " is-viewed" : ""}`}
          onClick={() => viewQuestion(i)}
        >
          <p className="dossier-question-q">{tp(qa.q)}</p>
          {viewed.has(i) && <RichText text={qa.a} className="dossier-answer" />}
        </div>
      ))}
      {footer?.(allViewed)}
    </div>
  );
}
