"use client";

import { useState } from "react";

export interface SuspectListItem {
  id: string;
  unlocked: boolean;
  mentioned?: boolean;
  name?: string;
  role?: string | null;
  intro_text?: string | null;
  fixed_questions?: { q: string; a: string }[];
  location_id?: string | null;
  portrait_url?: string | null;
  is_suspect?: boolean;
  is_expert?: boolean;
  is_case_subject?: boolean;
  specialization?: string | null;
  viewed?: boolean;
  wanted?: boolean;
}

interface SuspectsListProps {
  suspects: SuspectListItem[];
  onSelect: (suspect: SuspectListItem) => void;
}

const AVATAR_COLORS = ["#b5451b", "#2f6f8f", "#5a7d3a", "#7a4a9c", "#a3792f"];

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function avatarColor(id: string) {
  let hash = 0;
  for (let i = 0; i < id.length; i++) hash = (hash * 31 + id.charCodeAt(i)) >>> 0;
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
}

export function SuspectAvatar({
  id,
  name,
  portraitUrl,
  size,
  style,
}: {
  id: string;
  name?: string;
  portraitUrl?: string | null;
  size: number;
  style?: React.CSSProperties;
}) {
  if (portraitUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={portraitUrl}
        alt={name ?? ""}
        style={{
          width: size,
          height: size,
          aspectRatio: "1 / 1",
          objectFit: "cover",
          borderRadius: "50%",
          flexShrink: 0,
          ...style,
        }}
      />
    );
  }
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: avatarColor(id),
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontSize: size * 0.34,
        fontWeight: "bold",
        flexShrink: 0,
        ...style,
      }}
    >
      {initials(name ?? "")}
    </div>
  );
}

export default function SuspectsList({ suspects, onSelect }: SuspectsListProps) {
  const [mentionPopup, setMentionPopup] = useState<SuspectListItem | null>(null);
  const cardCount = suspects.filter((s) => s.unlocked || s.mentioned).length;

  return (
    <div className="corkboard-wrap">
      <div className="corkboard-header">
        <span>ДЕЛО №9704 · ПОДОЗРЕВАЕМЫЕ И СВИДЕТЕЛИ</span>
        <span className="corkboard-count">В КАРТОТЕКЕ: {cardCount}</span>
      </div>

      <div className="corkboard">
        {suspects.map((s) => {
          if (s.unlocked) {
            return (
              <div key={s.id} className="polaroid" onClick={() => onSelect(s)}>
                <div className="pin" />
                <div className="polaroid-photo">
                  {s.portrait_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={s.portrait_url} alt={s.name ?? ""} className="polaroid-photo-img" />
                  ) : (
                    <div className="polaroid-photo-fallback" style={{ background: avatarColor(s.id) }}>
                      {initials(s.name ?? "")}
                    </div>
                  )}
                  {/* is_case_subject=false — нарративные персонажи вроде дежурного
                      ГУВД, который выдаёт вводную по делу: допрос к ним не
                      применим, статус "опрошен" не показываем, в отличие от
                      is_suspect (которое лишь различает "подозреваемый"/
                      "свидетель" и не отражает этот случай). */}
                  {s.viewed && s.is_case_subject !== false && (
                    <span className="stamp stamp-militia">ОПРОШЕН</span>
                  )}
                  {s.wanted && <span className="stamp stamp-wanted">В РОЗЫСКЕ</span>}
                </div>
                <strong className="polaroid-name">{s.name}</strong>
                {s.role && <p className="polaroid-role">{s.role}</p>}
              </div>
            );
          }

          if (s.mentioned) {
            return (
              <div key={s.id} className="polaroid" onClick={() => setMentionPopup(s)}>
                <div className="pin" />
                <div className="polaroid-photo polaroid-photo-unknown">
                  <div className="unknown-silhouette" />
                  <span className="stamp stamp-unmet">НЕ ОПРОШЕН</span>
                </div>
                <strong className="polaroid-name">{s.name}</strong>
                {s.role && <p className="polaroid-role">{s.role}</p>}
              </div>
            );
          }

          return (
            <div key={s.id} className="polaroid polaroid-unknown">
              <div className="pin" />
              <div className="polaroid-photo polaroid-photo-unknown">
                <div className="unknown-silhouette" />
              </div>
              <strong className="polaroid-name polaroid-name-unknown">Не установлен</strong>
              <p className="polaroid-role">Данных нет</p>
            </div>
          );
        })}
      </div>

      {mentionPopup && (
        <div className="mention-popup-overlay" onClick={() => setMentionPopup(null)}>
          <div className="mention-popup-card" onClick={(e) => e.stopPropagation()}>
            <div className="mention-popup-title">Проходит по делу</div>
            <p className="mention-popup-text">
              Этот человек упоминается в показаниях, но вы его ещё не допрашивали. Установите, где
              его найти — адреса и связи всплывают в разговорах с другими фигурантами.
            </p>
            <button className="dossier-btn" onClick={() => setMentionPopup(null)}>
              Продолжить расследование
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
