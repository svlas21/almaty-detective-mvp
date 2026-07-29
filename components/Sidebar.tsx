"use client";

import { useState } from "react";
import { useParams } from "next/navigation";

export type SidebarTab = "map" | "suspects" | "expertise" | "evidence" | "accuse" | "log" | "help";

interface SidebarProps {
  active: SidebarTab;
  onChange: (tab: SidebarTab) => void;
  accusationUnlocked: boolean;
}

const ITEMS: { id: SidebarTab; icon: string; label: string }[] = [
  { id: "map", icon: "🗺", label: "Карта" },
  { id: "suspects", icon: "🕵", label: "Подозреваемые" },
  { id: "expertise", icon: "🧪", label: "Экспертиза" },
  { id: "evidence", icon: "🗂", label: "Улики" },
  { id: "accuse", icon: "⚖", label: "Обвинение" },
  { id: "log", icon: "🕒", label: "Журнал" },
  { id: "help", icon: "❓", label: "Помощь" },
];

// process.env.NODE_ENV инлайнится сборщиком и в клиентском бандле —
// проверка тут лишь прячет кнопку в UI, реальная защита — на сервере
// в app/api/dev/reset-session/route.ts.
const IS_DEV = process.env.NODE_ENV !== "production";

export default function Sidebar({ active, onChange, accusationUnlocked }: SidebarProps) {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

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
        {ITEMS.map((item) => {
          const disabled = item.id === "accuse" && !accusationUnlocked;
          return (
            <button
              key={item.id}
              className={`sidebar-btn ${active === item.id ? "active" : ""}`}
              onClick={() => (disabled ? undefined : onChange(item.id))}
              disabled={disabled}
              title={disabled ? undefined : item.label}
            >
              {item.icon}
            </button>
          );
        })}

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
