"use client";

import { useState } from "react";
import { SuspectAvatar } from "@/components/SuspectsList";
import InterrogationProtocol from "@/components/InterrogationProtocol";
import RichText, { tp } from "@/components/RichText";
import VoiceButton from "@/components/VoiceButton";

interface IntroCharacter {
  id: string;
  name?: string;
  role?: string | null;
  portrait_url?: string | null;
  intro_text?: string | null;
  intro_audio_url?: string | null;
  fixed_questions?: { q: string; a: string }[];
}

interface IntroScreenProps {
  character: IntroCharacter;
  onFinish: () => void;
}

export default function IntroScreen({ character, onFinish }: IntroScreenProps) {
  const [spoken, setSpoken] = useState<number | null>(character.intro_audio_url ? 0 : null);
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

        <h2 className="dossier-name">{tp(character.name)}</h2>
        {character.role && (
          <div className="dossier-role-row">
            <span className="dossier-role">{tp(character.role)}</span>
          </div>
        )}

        {character.intro_audio_url && (
          <div className="voice-row">
            <VoiceButton src={character.intro_audio_url} label="Послушать шефа" onProgress={setSpoken} />
          </div>
        )}

        <RichText text={character.intro_text} className="dossier-quote" animate spoken={spoken} />
      </div>

      <InterrogationProtocol
        questions={character.fixed_questions ?? []}
        footer={(allViewed) =>
          allViewed && (
            <div style={{ textAlign: "center", marginTop: 20 }}>
              <button className="dossier-btn" onClick={onFinish}>
                Допросить подозреваемых
              </button>
            </div>
          )
        }
      />
    </div>
  );
}
