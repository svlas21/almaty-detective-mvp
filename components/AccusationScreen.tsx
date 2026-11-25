"use client";

import RichText, { tp } from "@/components/RichText";
import { SuspectAvatar } from "@/components/SuspectsList";
import { img } from "@/lib/img";
import { useEffect, useState } from "react";

interface CollectedEvidenceItem {
  id: string;
  name: string;
  description: string | null;
  kind?: "thing" | "testimony" | "expertise" | "document" | null;
  image_url?: string | null;
}

interface Person {
  id: string;
  name?: string;
  portrait_url?: string | null;
  /** Игрок уже встретил этого человека в игре */
  unlocked?: boolean;
  is_expert?: boolean;
  is_case_subject?: boolean;
}

const KIND_SECTIONS: { kind: string; title: string }[] = [
  { kind: "thing", title: "Вещественные доказательства" },
  { kind: "expertise", title: "Заключения экспертов" },
  { kind: "document", title: "Справки и документы" },
  { kind: "testimony", title: "Показания" },
];

const STEPS = ["Организатор", "Соучастники", "Дело закрыто"];

function Steps({ current }: { current: number }) {
  return (
    <ol className="accuse-steps" aria-label="Этапы обвинения">
      {STEPS.map((label, i) => (
        <li key={label} className={`accuse-step${i === current ? " is-current" : ""}${i < current ? " is-done" : ""}`}>
          <span className="accuse-step-n">{i < current ? "✓" : i + 1}</span>
          {label}
        </li>
      ))}
    </ol>
  );
}

function Sheet({ step, children }: { step: number; children: React.ReactNode }) {
  return (
    <div className="accuse">
      <header className="accuse-head">
        <div className="accuse-case">Дело № 9704 · ГУВД г. Алматы</div>
        <h2 className="accuse-title">Обвинительное заключение</h2>
        <Steps current={step} />
      </header>
      <div className="accuse-sheet">{children}</div>
    </div>
  );
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

export interface Debrief {
  title?: string;
  truth: { when: string; text: string }[];
  false_leads: { who: string; why: string; why_not: string }[];
}

function DebriefView({ debrief }: { debrief: Debrief }) {
  return (
    <div className="debrief">
      <div className="debrief-head">
        <span className="debrief-kicker">Разбор дела</span>
        <h2>{tp(debrief.title ?? "Как всё было на самом деле")}</h2>
      </div>
      <ol className="debrief-timeline">
        {debrief.truth.map((t, i) => (
          <li key={i} className="debrief-step">
            <span className="debrief-when">{tp(t.when)}</span>
            <RichText text={t.text} className="debrief-text" />
          </li>
        ))}
      </ol>
      {debrief.false_leads.length > 0 && (
        <>
          <h3 className="debrief-sub">Ложные следы</h3>
          <div className="debrief-leads">
            {debrief.false_leads.map((l, i) => (
              <div key={i} className="debrief-lead">
                <div className="debrief-lead-who">{tp(l.who)}</div>
                <div className="debrief-lead-row">
                  <span className="debrief-lead-label">Почему подозревали</span>
                  <RichText text={l.why} />
                </div>
                <div className="debrief-lead-row is-not">
                  <span className="debrief-lead-label">На самом деле</span>
                  <RichText text={l.why_not} />
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

interface AccusationScreenProps {
  sessionId: string;
  collectedEvidence: CollectedEvidenceItem[];
  /** Фигуранты дела — для портретов в карточках выбора */
  people?: Person[];
}

export default function AccusationScreen({ sessionId, collectedEvidence, people = [] }: AccusationScreenProps) {
  const personById = (id: string) => people.find((p) => p.id === id);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
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
  const [debrief, setDebrief] = useState<Debrief | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/games/${sessionId}/accusation`)
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (cancelled) return;
        if (!data) {
          setLoadError(true);
        } else {
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
      setDebrief(data.debrief ?? null);
      setStage("ending");
    } else {
      setAccompliceWrong(true);
    }
  }

  if (loading || loadError) {
    return (
      <Sheet step={0}>
        <p className="accuse-muted">{loading ? "Загрузка…" : "Обвинение пока недоступно."}</p>
      </Sheet>
    );
  }

  if (stage === "ending") {
    return (
      <>
        <Sheet step={2}>
          <div className="accuse-closed">
            <span className="accuse-closed-stamp">Дело закрыто</span>
            <RichText text={endingText} className="rt-ending" />
          </div>
        </Sheet>
        {debrief && <DebriefView debrief={debrief} />}
      </>
    );
  }

  if (stage === "accomplices") {
    const answered = Object.keys(accompliceAnswers).length;
    return (
      <Sheet step={1}>
        <p className="accuse-lead">Организатор установлен. Теперь — роль каждого из остальных фигурантов.</p>

        <div className="accuse-people">
          {accomplices.map((acc) => {
            const person = personById(acc.characterId);
            return (
              <section key={acc.characterId} className="accuse-person">
                <div className="accuse-person-head">
                  <SuspectAvatar id={acc.characterId} name={person?.name} portraitUrl={person?.portrait_url} size={56} style={{ borderRadius: 3 }} />
                  <h3 className="accuse-person-q">{tp(acc.question)}</h3>
                </div>
                <div className="accuse-options" role="radiogroup">
                  {acc.options.map((option, i) => {
                    const on = accompliceAnswers[acc.characterId] === i;
                    return (
                      <button
                        key={i}
                        role="radio"
                        aria-checked={on}
                        className={`accuse-option${on ? " is-on" : ""}`}
                        onClick={() => {
                          setAccompliceWrong(false);
                          setAccompliceAnswers((prev) => ({ ...prev, [acc.characterId]: i }));
                        }}
                      >
                        {tp(option.label)}
                      </button>
                    );
                  })}
                </div>
              </section>
            );
          })}
        </div>

        {accompliceWrong && (
          <div className="accuse-rejected" role="alert">
            <span className="accuse-rejected-stamp">Возвращено</span>
            Прокурор вернул дело на доработку: в ролях фигурантов что-то не сходится.
          </div>
        )}

        <div className="accuse-actions">
          <span className="accuse-count">
            Отвечено: {answered} из {accomplices.length}
          </span>
          <button
            className="accuse-submit"
            disabled={answered < accomplices.length || accompliceSubmitting}
            onClick={submitAccomplices}
          >
            {accompliceSubmitting ? "Проверяем…" : "Подписать и закрыть дело"}
          </button>
        </div>
      </Sheet>
    );
  }

  const ready = !!selectedOrganizerId && selectedEvidenceIds.size >= 2;
  // Обвинить можно любого, с кем игрок познакомился по делу (кроме экспертов и
  // персонажей вводной): список не подсказывает, кто подозреваемый, а кто нет.
  // Верный ответ проверяет сервер (accusation/organizer) по id.
  const knownOptions: OrganizerOption[] = people
    .filter((p) => p.unlocked && !p.is_expert && p.is_case_subject !== false && p.name)
    .map((p) => ({ character_id: p.id, label: p.name as string }));
  return (
    <Sheet step={0}>
      <h3 className="accuse-q">1. Кто организовал похищение и убийство Игоря Сартакова?</h3>
      <p className="accuse-muted">
        {knownOptions.length === 0
          ? "Пока обвинять некого. Здесь появятся все, с кем вы познакомитесь по делу."
          : "Здесь все, с кем вы познакомились по делу."}
      </p>
      <div className="accuse-suspects" role="radiogroup">
        {knownOptions.map((option) => {
          const person = personById(option.character_id);
          const on = selectedOrganizerId === option.character_id;
          return (
            <button
              key={option.character_id}
              role="radio"
              aria-checked={on}
              className={`accuse-suspect${on ? " is-on" : ""}`}
              onClick={() => {
                setOrganizerWrong(false);
                setSelectedOrganizerId(option.character_id);
              }}
            >
              <SuspectAvatar id={option.character_id} name={option.label} portraitUrl={person?.portrait_url} size={84} style={{ borderRadius: 3, display: "block" }} />
              <span className="accuse-suspect-name">{tp(option.label)}</span>
              {on && <span className="accuse-suspect-mark">Обвиняемый</span>}
            </button>
          );
        })}
      </div>

      <h3 className="accuse-q">2. На каких доказательствах строится обвинение?</h3>
      <p className="accuse-muted">Отметьте не меньше двух. Здесь только то, что уже лежит в папке дела.</p>
      {collectedEvidence.length === 0 && <p className="accuse-muted">Папка пока пуста.</p>}
      {KIND_SECTIONS.map((sec) => {
        const items = collectedEvidence.filter((e) => (e.kind ?? "thing") === sec.kind);
        if (!items.length) return null;
        return (
          <div key={sec.kind} className="accuse-ev-group">
            <div className="accuse-ev-title">{sec.title}</div>
            <div className="accuse-ev-grid">
              {items.map((e) => {
                const on = selectedEvidenceIds.has(e.id);
                return (
                  <button
                    key={e.id}
                    role="checkbox"
                    aria-checked={on}
                    className={`accuse-ev${on ? " is-on" : ""}`}
                    onClick={() => {
                      setOrganizerWrong(false);
                      toggleEvidence(e.id);
                    }}
                  >
                    <span className="accuse-ev-box" aria-hidden="true" />
                    <span className="accuse-ev-name">{tp(e.name)}</span>
                    {e.image_url && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img className="accuse-ev-thumb" src={img(e.image_url, { w: 120, q: 70 })} alt="" loading="lazy" />
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        );
      })}

      {organizerWrong && (
        <div className="accuse-rejected" role="alert">
          <span className="accuse-rejected-stamp">Возвращено</span>
          Прокурор вернул дело на доработку: обвинение не сходится с доказательствами.
        </div>
      )}

      <div className="accuse-actions">
        <span className="accuse-count">
          {selectedOrganizerId ? "Обвиняемый выбран" : "Обвиняемый не выбран"} · доказательств: {selectedEvidenceIds.size}
        </span>
        <button className="accuse-submit" disabled={!ready || organizerSubmitting} onClick={submitOrganizer}>
          {organizerSubmitting ? "Проверяем…" : "Предъявить обвинение"}
        </button>
      </div>
    </Sheet>
  );
}
