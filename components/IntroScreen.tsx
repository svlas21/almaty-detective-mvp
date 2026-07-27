"use client";

import { SuspectAvatar } from "@/components/SuspectsList";
import InterrogationProtocol from "@/components/InterrogationProtocol";

interface IntroCharacter {
  id: string;
  name?: string;
  role?: string | null;
  portrait_url?: string | null;
  intro_text?: string | null;
  fixed_questions?: { q: string; a: string }[];
}

interface IntroScreenProps {
  character: IntroCharacter;
  onFinish: () => void;
}

export default function IntroScreen({ character, onFinish }: IntroScreenProps) {
  return (
    <div className="dossier-page">
      <div className="dossier-tab-row">
        <span className="dossier-tab">Дело</span>
      </div>

      <div className="dossier-card">
        <div className="dossier-portrait-wrap">
          <div className="dossier-portrait-tape" />
          <div className="dossier-portrait-frame">
            <SuspectAvatar
              id={character.id}
              name={character.name}
              portraitUrl={character.portrait_url}
              size={130}
              style={{ borderRadius: 3, display: "block" }}
            />
          </div>
        </div>

        <h2 className="dossier-name">{character.name}</h2>
        {character.role && (
          <div className="dossier-role-row">
            <span className="dossier-role">{character.role}</span>
          </div>
        )}

        {character.intro_text && <p className="dossier-quote">{character.intro_text}</p>}
      </div>

      <InterrogationProtocol
        questions={character.fixed_questions ?? []}
        footer={(allViewed) =>
          allViewed && (
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button className="dossier-btn" onClick={onFinish}>
                Открыть карту Алматы
              </button>
            </div>
          )
        }
      />
    </div>
  );
}
