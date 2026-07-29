"use client";

import { SuspectAvatar, type SuspectListItem } from "@/components/SuspectsList";
import InterrogationProtocol from "@/components/InterrogationProtocol";

interface CollectedEvidenceItem {
  id: string;
  name: string;
  description: string | null;
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
}: SuspectDetailProps) {
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

      {(suspect.is_suspect === true || suspect.is_expert === true) && (
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
