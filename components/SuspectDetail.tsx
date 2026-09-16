"use client";

import { SuspectAvatar, type SuspectListItem } from "@/components/SuspectsList";
import InterrogationProtocol from "@/components/InterrogationProtocol";

interface CollectedEvidenceItem {
  id: string;
  name: string;
  description: string | null;
}

interface TopicItem {
  id: string;
  label: string;
  subject_character_id: string | null;
}

interface SuspectDetailProps {
  suspect: SuspectListItem;
  collectedEvidence: CollectedEvidenceItem[];
  reaction: { evidenceName: string; text: string } | null;
  confession: string | null;
  presentingId: string | null;
  onPresent: (evidence: CollectedEvidenceItem) => void;
  onInterrogationComplete: (characterId: string) => void;
  onQuestionViewed: (characterId: string, questionIndex: number) => void;
  topics: TopicItem[];
  topicAnswer: { topicLabel: string; text: string } | null;
  askingTopicId: string | null;
  onAsk: (topic: TopicItem) => void;
}

export default function SuspectDetail({
  suspect,
  collectedEvidence,
  reaction,
  confession,
  presentingId,
  onPresent,
  onInterrogationComplete,
  onQuestionViewed,
  topics,
  topicAnswer,
  askingTopicId,
  onAsk,
}: SuspectDetailProps) {
  // Тема не должна предлагать спросить у персонажа про самого себя
  // (см. supabase/009_topic_subject_character.sql) — сравнение по id,
  // а не по label/name, чтобы не зависеть от текстовых совпадений.
  const visibleTopics = topics.filter((t) => t.subject_character_id !== suspect.id);

  return (
    <div className="dossier-page">
      <div className="dossier-tab-row">
        <span className="dossier-tab">Дело · Оперативная справка</span>
      </div>

      <div className="dossier-card">
        <div className="dossier-portrait-wrap">
          <div className="dossier-portrait-tape" />
          <div className="dossier-portrait-frame">
            <SuspectAvatar
              id={suspect.id}
              name={suspect.name}
              portraitUrl={suspect.portrait_url}
              size={112}
              style={{ borderRadius: 3, display: "block" }}
            />
          </div>
        </div>

        <h2 className="dossier-name">{suspect.name}</h2>
        {suspect.role && (
          <div className="dossier-role-row">
            <span className="dossier-role">{suspect.role}</span>
          </div>
        )}

        {suspect.intro_text && <p className="dossier-quote">{suspect.intro_text}</p>}
      </div>

      <InterrogationProtocol
        questions={suspect.fixed_questions ?? []}
        onAllViewed={() => onInterrogationComplete(suspect.id)}
        onQuestionViewed={(i) => onQuestionViewed(suspect.id, i)}
      />

      {visibleTopics.length > 0 && (
        <div className="dossier-card">
          <div className="dossier-section-label">Спросить про...</div>

          <div className="dossier-evidence-grid">
            {visibleTopics.map((t) => (
              <div
                key={t.id}
                className={`dossier-evidence-tag${askingTopicId && askingTopicId !== t.id ? " is-busy" : ""}`}
                onClick={() => (askingTopicId ? undefined : onAsk(t))}
              >
                {t.label}
              </div>
            ))}
          </div>

          {topicAnswer && (
            <div className="dossier-reaction">
              <div className="dossier-reaction-label">{topicAnswer.topicLabel}</div>
              <p>{topicAnswer.text}</p>
            </div>
          )}
        </div>
      )}

      {/* Раньше секция была доступна только is_suspect/is_expert — свидетели
          (Валентина и т.п.) с реально заполненными reactions её не видели,
          хотя предъявление улики им нужно для reaction-chain механик и
          экрана "Обвинение" (см. present/route.ts, required_reaction_evidence_id).
          has_reactions добавлен как отдельное условие, is_suspect/is_expert
          не убраны — иначе фигуранты с пока пустым reactions (шаблонная
          заглушка-реакция всё равно значима, см. present/route.ts) потеряли бы
          секцию. */}
      {(suspect.is_suspect === true || suspect.is_expert === true || suspect.has_reactions === true) &&
        (suspect.fixed_questions?.length ?? 0) > 0 && (
        <div className="dossier-card">
          <div className="dossier-section-label">
            {suspect.is_expert ? "Передать на экспертизу" : "Предъявить улику"}
          </div>

          {collectedEvidence.length === 0 ? (
            <div className="dossier-evidence-empty">
              <div className="dossier-evidence-empty-icon" />
              <span>Улик для предъявления пока нет — соберите их на месте происшествия.</span>
            </div>
          ) : (
            <div className="dossier-evidence-grid">
              {collectedEvidence.map((e) => (
                <div
                  key={e.id}
                  className={`dossier-evidence-tag${presentingId && presentingId !== e.id ? " is-busy" : ""}`}
                  onClick={() => (presentingId ? undefined : onPresent(e))}
                >
                  {e.name}
                </div>
              ))}
            </div>
          )}

          {reaction && (
            <div className="dossier-reaction">
              <div className="dossier-reaction-label">{reaction.evidenceName}</div>
              <p>{reaction.text}</p>
            </div>
          )}

          {confession && (
            <div className="dossier-confession">
              <span className="dossier-confession-label">Признание</span>
              <p>{confession}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
