"use client";

import { useEffect, useState } from "react";
import { isMuted, setMuted, tick } from "@/lib/sfx";
import { useParams } from "next/navigation";

export type SidebarTab = "map" | "suspects" | "expertise" | "evidence" | "accuse" | "log" | "help";

interface SidebarProps {
  active: SidebarTab;
  onChange: (tab: SidebarTab) => void;
}

const ITEMS: { id: SidebarTab; icon: string; label: string }[] = [
  { id: "map", icon: "🗺", label: "Карта" },
  { id: "suspects", icon: "🕵", label: "Подозреваемые" },
  { id: "expertise", icon: "🧪", label: "Экспертиза" },
  { id: "evidence", icon: "🗂", label: "Улики" },
  { id: "accuse", icon: "⚖", label: "Обвинение" },
  { id: "log", icon: "📒", label: "Ежедневник" },
  { id: "help", icon: "📋", label: "Памятка" },
];

// Кнопка «Начать заново» видна, пока идёт разработка — и в npm run dev, и в
// npm start. Перед запуском для игроков: NEXT_PUBLIC_DEV_TOOLS=off в .env
// (прячет кнопку; сервер в app/api/dev/reset-session/route.ts тоже откажет).
const IS_DEV = process.env.NEXT_PUBLIC_DEV_TOOLS !== "off";

export default function Sidebar({ active, onChange }: SidebarProps) {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [muted, setMutedState] = useState(false);
  useEffect(() => setMutedState(isMuted()), []);
  function toggleSound() {
    const next = !muted;
    setMuted(next);
    setMutedState(next);
    if (!next) tick();
  }

  async function confirmReset() {
    setResetting(true);
    const res = await fetch("/api/dev/reset-session", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId }),
    });
    if (res.ok) {
      window.location.href = `/game/${sessionId}`;
      return;
    }
    setResetting(false);
    setConfirmOpen(false);
  }

  return (
    <>
      <nav className="sidebar">
        {ITEMS.map((item) => (
          <button
            key={item.id}
            className={`sidebar-btn ${active === item.id ? "active" : ""}`}
            onClick={() => onChange(item.id)}
            title={item.label}
          >
            {item.icon}
          </button>
        ))}

        <button
          className="sidebar-btn"
          title={muted ? "Звуки выключены — включить" : "Звуки включены — выключить"}
          aria-pressed={!muted}
          onClick={toggleSound}
        >
          {muted ? "🔇" : "🔊"}
        </button>

        {IS_DEV && (
          <button
            className="sidebar-btn"
            title="Начать заново (только для тестов)"
            onClick={() => setConfirmOpen(true)}
          >
            🔄
          </button>
        )}
      </nav>

      {confirmOpen && (
        <div
          onClick={() => (resetting ? undefined : setConfirmOpen(false))}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.6)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 200,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="card"
            style={{ maxWidth: 340, textAlign: "center" }}
          >
            <p style={{ margin: 0 }}>Сбросить прогресс и начать дело заново? Это нельзя отменить.</p>
            <div style={{ marginTop: 16, display: "flex", gap: 12, justifyContent: "center" }}>
              <button
                className="btn"
                style={{ background: "#384050" }}
                onClick={() => setConfirmOpen(false)}
                disabled={resetting}
              >
                Отмена
              </button>
              <button className="btn" onClick={confirmReset} disabled={resetting}>
                {resetting ? "Сбрасываем…" : "Да, начать заново"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
