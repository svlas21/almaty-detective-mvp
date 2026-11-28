"use client";

import { tp } from "@/components/RichText";
import { useState } from "react";
import { getEvidenceIcon } from "@/lib/evidenceIcons";

interface EvidencePoolItem {
  id: string;
  name: string;
}

interface EvidenceSearchProps {
  pool: EvidencePoolItem[];
  onGuess: (evidenceId: string) => void;
  triedIds: Set<string>;
  /** Итог по уже выбранным карточкам в этом осмотре. */
  resultById?: Record<string, "found" | "present" | "miss" | "pending">;
  /** Улики, уже лежащие в папке дела (в т.ч. найденные в прошлых осмотрах). */
  foundIds?: Set<string>;
  /** Карточка, результат которой сейчас показан */
  activeId?: string;
  /** Игрок ответил «Нет» на вопрос об уликах. */
  onAnswerNo?: () => void;
}

export default function EvidenceSearch({ pool, onGuess, triedIds, resultById = {}, foundIds, activeId, onAnswerNo }: EvidenceSearchProps) {
  const [askedYet, setAskedYet] = useState<"idle" | "searching">("idle");

  if (askedYet === "idle") {
    return (
      <div className="evidence-ask-prompt">
        <p>Вы заметили какие-либо улики на месте?</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="people-sheet-search-btn" onClick={() => setAskedYet("searching")}>
            Да
          </button>
          <button className="dossier-btn-muted" onClick={() => onAnswerNo?.()}>
            Нет
          </button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="evidence-cloud-prompt">Выберите, что, по-вашему, могло быть на месте:</p>
      <div className="evidence-cloud">
        {pool.map((item) => {
          // Label облака уже промаскирован под категорию (реальную или
          // decoy) — своей отдельной "настоящей" улики за ним нет, так что
          // передаём его и как name, и как generic_category: та же функция,
          // что и у "Собранных улик", просто всегда попадает в первую ветку.
          const Icon = getEvidenceIcon({ name: item.name, generic_category: item.name });
          const state =
            foundIds?.has(item.id) ? "found" : resultById[item.id] ?? (triedIds.has(item.id) ? "pending" : null);
          return (
            <span
              key={item.id}
              className={`evidence-tag-label${state ? ` is-${state}` : ""}${activeId === item.id ? " is-active" : ""}`}
              // найденную улику и осмотренный предмет можно открыть снова; «мимо» — нельзя
              onClick={state === "miss" || state === "pending" ? undefined : () => onGuess(item.id)}
              title={state === "found" || state === "present" ? "Открыть снова" : undefined}
            >
              <Icon className="evidence-tag-icon" strokeWidth={1.75} aria-hidden />
              {tp(item.name)}
              {state === "found" && <span className="evidence-tag-stamp">Улика</span>}
            </span>
          );
        })}
      </div>
    </div>
  );
}