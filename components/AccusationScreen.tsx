"use client";

import { useEffect, useState } from "react";

interface CollectedEvidenceItem {
  id: string;
  name: string;
  description: string | null;
}

interface OrganizerOption {
  character_id: string;
  label: string;
}

interface AccompliceQuestion {
  characterId: string;
  question: string;
  options: { label: string }[];
}

interface AccusationScreenProps {
  sessionId: string;
  collectedEvidence: CollectedEvidenceItem[];
}

export default function AccusationScreen({ sessionId, collectedEvidence }: AccusationScreenProps) {
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [organizerOptions, setOrganizerOptions] = useState<OrganizerOption[]>([]);
  const [accomplices, setAccomplices] = useState<AccompliceQuestion[]>([]);

  const [stage, setStage] = useState<"organizer" | "accomplices" | "ending">("organizer");

  const [selectedOrganizerId, setSelectedOrganizerId] = useState<string | null>(null);
  const [selectedEvidenceIds, setSelectedEvidenceIds] = useState<Set<string>>(new Set());
  const [organizerSubmitting, setOrganizerSubmitting] = useState(false);
  const [organizerWrong, setOrganizerWrong] = useState(false);

  const [accompliceAnswers, setAccompliceAnswers] = useState<Record<string, number>>({});
  const [accompliceSubmitting, setAccompliceSubmitting] = useState(false);
  const [accompliceWrong, setAccompliceWrong] = useState(false);

  const [endingText, setEndingText] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/games/${sessionId}/accusation`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setLoadError(true);
        } else {
          setOrganizerOptions(data.organizerOptions ?? []);
          setAccomplices(data.accomplices ?? []);
        }
        setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

  function toggleEvidence(id: string) {
    setSelectedEvidenceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function submitOrganizer() {
    if (!selectedOrganizerId || selectedEvidenceIds.size < 2) return;
    setOrganizerSubmitting(true);
    setOrganizerWrong(false);
    const res = await fetch(`/api/games/${sessionId}/accusation/organizer`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        organizerCharacterId: selectedOrganizerId,
        evidenceIds: [...selectedEvidenceIds],
      }),
    });
    const data = res.ok ? await res.json() : { correct: false };
    setOrganizerSubmitting(false);
    if (data.correct) {
      setStage("accomplices");
    } else {
      setOrganizerWrong(true);
    }
  }

  async function submitAccomplices() {
    if (Object.keys(accompliceAnswers).length < accomplices.length) return;
    setAccompliceSubmitting(true);
    setAccompliceWrong(false);
    const res = await fetch(`/api/games/${sessionId}/accusation/accomplices`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        answers: Object.entries(accompliceAnswers).map(([characterId, optionIndex]) => ({
          characterId,
          optionIndex,
        })),
      }),
    });
    const data = res.ok ? await res.json() : { correct: false };
    setAccompliceSubmitting(false);
    if (data.correct) {
      setEndingText(data.endingText ?? "");
      setStage("ending");
    } else {
      setAccompliceWrong(true);
    }
  }

  if (loading) {
    return (
      <div className="card">
        <h2>Обвинение</h2>
        <p className="muted">Загрузка…</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="card">
        <h2>Обвинение</h2>
        <p className="muted">Обвинение пока недоступно.</p>
      </div>
    );
  }

  if (stage === "ending") {
    return (
      <div className="card" style={{ textAlign: "center" }}>
        <h2>Дело закрыто</h2>
        <p style={{ marginTop: 16, lineHeight: 1.6, textAlign: "left" }}>{endingText}</p>
      </div>
    );
  }

  if (stage === "accomplices") {
    return (
      <div className="card">
        <h2>Обвинение · сообщники</h2>
        <p className="muted">Ответьте на вопрос по каждому из причастных.</p>

        {accomplices.map((acc) => (
          <div key={acc.characterId} style={{ marginTop: 20 }}>
            <strong>{acc.question}</strong>
            <div style={{ marginTop: 8, display: "flex", flexDirection: "column", gap: 8 }}>
              {acc.options.map((option, i) => (
                <label key={i} style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}>
                  <input
                    type="radio"
                    name={`accomplice-${acc.characterId}`}
                    checked={accompliceAnswers[acc.characterId] === i}
                    onChange={() =>
                      setAccompliceAnswers((prev) => ({ ...prev, [acc.characterId]: i }))
                    }
                  />
                  {option.label}
                </label>
              ))}
            </div>
          </div>
        ))}

        {accompliceWrong && (
          <p style={{ marginTop: 16, color: "#c96a4a" }}>Кажется, это не то. Подумайте ещё.</p>
        )}

        <div style={{ marginTop: 20 }}>
          <button
            className="btn"
            disabled={Object.keys(accompliceAnswers).length < accomplices.length || accompliceSubmitting}
            onClick={submitAccomplices}
          >
            {accompliceSubmitting ? "Проверяем…" : "Завершить дело"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <h2>Обвинение · организатор</h2>
      <p className="muted">Кто организовал похищение и убийство Игоря Матросова?</p>

      <div style={{ marginTop: 12, display: "flex", flexDirection: "column", gap: 8 }}>
        {organizerOptions.map((option) => (
          <label
            key={option.character_id}
            style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }}
          >
            <input
              type="radio"
              name="organizer"
              checked={selectedOrganizerId === option.character_id}
              onChange={() => setSelectedOrganizerId(option.character_id)}
            />
            {option.label}
          </label>
        ))}
      </div>

      <p className="muted" style={{ marginTop: 20 }}>
        Обоснуйте выбор минимум двумя уликами:
      </p>
      <div style={{ marginTop: 8, display: "flex", flexWrap: "wrap", gap: 8 }}>
        {collectedEvidence.map((e) => (
          <span
            key={e.id}
            className="topic-chip"
            style={selectedEvidenceIds.has(e.id) ? { opacity: 1, borderColor: "#b5451b" } : { opacity: 0.55 }}
            onClick={() => toggleEvidence(e.id)}
          >
            {e.name}
          </span>
        ))}
      </div>

      {organizerWrong && (
        <p style={{ marginTop: 16, color: "#c96a4a" }}>Кажется, это не то. Подумайте ещё.</p>
      )}

      <div style={{ marginTop: 20 }}>
        <button
          className="btn"
          disabled={!selectedOrganizerId || selectedEvidenceIds.size < 2 || organizerSubmitting}
          onClick={submitOrganizer}
        >
          {organizerSubmitting ? "Проверяем…" : "Обвинить"}
        </button>
      </div>
    </div>
  );
}
