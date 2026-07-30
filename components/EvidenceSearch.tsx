"use client";

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
}

export default function EvidenceSearch({ pool, onGuess, triedIds }: EvidenceSearchProps) {
  const [askedYet, setAskedYet] = useState<"idle" | "searching">("idle");

  if (askedYet === "idle") {
    return (
      <div className="evidence-ask-prompt">
        <p>Вы заметили какие-либо улики на месте?</p>
        <div style={{ display: "flex", gap: 10, justifyContent: "center" }}>
          <button className="people-sheet-search-btn" onClick={() => setAskedYet("searching")}>
            Да
          </button>
          <button className="dossier-btn-muted" onClick={() => setAskedYet("idle")}>
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
          return (
            <span
              key={item.id}
              className="evidence-tag-label"
              style={triedIds.has(item.id) ? { opacity: 0.4, pointerEvents: "none" } : undefined}
              onClick={() => onGuess(item.id)}
            >
              <Icon className="evidence-tag-icon" strokeWidth={1.75} aria-hidden />
              {item.name}
            </span>
          );
        })}
      </div>
    </div>
  );
}