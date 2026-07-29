"use client";

import { useState } from "react";

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
      <div className="card">
        <p>Вы заметили какие-либо улики на месте?</p>
        <button className="btn" onClick={() => setAskedYet("searching")} style={{ marginRight: 8 }}>
          Да
        </button>
        <button className="btn" style={{ background: "#384050" }} onClick={() => setAskedYet("idle")}>
          Нет
        </button>
      </div>
    );
  }

  return (
    <div className="card">
      <p className="muted">Выберите, что, по-вашему, могло быть на месте:</p>
      <div className="evidence-cloud">
        {pool.map((item) => (
          <span
            key={item.id}
            className="topic-chip"
            style={triedIds.has(item.id) ? { opacity: 0.4, pointerEvents: "none" } : undefined}
            onClick={() => onGuess(item.id)}
          >
            {item.name}
          </span>
        ))}
      </div>
    </div>
  );
}