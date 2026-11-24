"use client";

import { useMemo, useState } from "react";
import RichText, { tp } from "@/components/RichText";
import { clockLabel, dayLabel, gameDate } from "@/lib/gameClock";

/**
 * Ежедневник следователя: всё, что сделано по делу, по игровым дням и часам.
 * Записи — session_state.log (структурные, см. lib/journal.ts). Подряд идущие
 * пустые проверки при осмотре склеиваются в одну строку.
 */

export interface JournalEntry {
  type: string;
  at: string;
  gm?: number;
  text?: string;
  [key: string]: unknown;
}

type Filter = "all" | "travel" | "search" | "talk" | "present" | "evidence" | "chief" | "accuse";

const FILTERS: { id: Filter; label: string }[] = [
  { id: "all", label: "Всё" },
  { id: "travel", label: "Выезды" },
  { id: "search", label: "Осмотры" },
  { id: "talk", label: "Допросы" },
  { id: "present", label: "Предъявления" },
  { id: "evidence", label: "Улики" },
  { id: "chief", label: "Начальство" },
  { id: "accuse", label: "Обвинение" },
];

interface Row {
  key: string;
  gm?: number;
  filter: Filter;
  tag: string;
  title: string;
  note?: string;
  details?: string;
  accent?: "found" | "fail" | "done";
}

const str = (v: unknown) => (typeof v === "string" ? v : "");

function toRows(entries: JournalEntry[]): Row[] {
  const rows: Row[] = [];
  let missGroup: { row: Row; names: string[] } | null = null;

  entries.forEach((e, i) => {
    const key = `${e.at}-${i}`;
    const isMiss = e.type === "evidence" && e.outcome !== "found";
    if (!isMiss) missGroup = null;

    switch (e.type) {
      case "travel": {
        const place = str(e.locationName) || str(e.text).replace(/^Прибыли:\s*/, "");
        rows.push({ key, gm: e.gm, filter: "travel", tag: "Выезд", title: place });
        break;
      }
      case "location":
        rows.push({ key, gm: e.gm, filter: "travel", tag: "Новое место", title: str(e.text).replace(/^Открыта новая локация:\s*/, "") });
        break;
      case "evidence": {
        if (e.outcome === "found") {
          const src = str(e.source);
          rows.push({
            key,
            gm: e.gm,
            filter: "evidence",
            tag: "Улика",
            title: str(e.evidenceName),
            note: src ? (src === "ГУВД" ? "из ГУВД" : `от: ${src}`) : "найдено при осмотре",
            accent: "found",
          });
        } else {
          const name = str(e.evidenceName);
          if (missGroup) {
            if (name) missGroup.names.push(name);
            missGroup.row.title = missGroup.names.join(", ") || "ничего не найдено";
          } else {
            const row: Row = { key, gm: e.gm, filter: "search", tag: "Осмотр", title: name || "ничего не найдено", note: "к делу не относится" };
            missGroup = { row, names: name ? [name] : [] };
            rows.push(row);
          }
        }
        break;
      }
      case "question":
        rows.push({ key, gm: e.gm, filter: "talk", tag: "Допрос", title: `${str(e.characterName)}: «${str(e.question)}»`, details: str(e.answerText) });
        break;
      case "ask":
        rows.push({ key, gm: e.gm, filter: "talk", tag: "Вопрос", title: `${str(e.characterName)}: «${str(e.topicLabel)}»`, details: str(e.answerText) });
        break;
      case "present":
        rows.push({
          key,
          gm: e.gm,
          filter: "present",
          tag: "Предъявлено",
          title: `${str(e.characterName)} ← ${str(e.evidenceName)}`,
          details: str(e.reactionText),
        });
        break;
      case "call":
        rows.push({
          key,
          gm: e.gm,
          filter: "chief",
          tag: str(e.style) === "scene" ? "Начальство" : "Звонок",
          title: str(e.callerRole) ? `${str(e.callerRole)} · ${str(e.callerName)}` : str(e.callerName),
          details: str(e.dialogueText),
        });
        break;
      case "accuse": {
        const ok = e.correct === true;
        const final = e.stage === "accomplices";
        rows.push({
          key,
          gm: e.gm,
          filter: "accuse",
          tag: ok && final ? "Дело закрыто" : "Обвинение",
          title: final ? "Роли соучастников" : `Организатор: ${str(e.characterName)}`,
          note: ok ? "принято" : "не принято",
          accent: ok ? (final ? "done" : "found") : "fail",
        });
        break;
      }
      default:
        if (str(e.text)) rows.push({ key, gm: e.gm, filter: "all", tag: "Запись", title: str(e.text) });
    }
  });
  return rows;
}

export default function CaseJournal({ entries, caseNumber = "9704" }: { entries: JournalEntry[]; caseNumber?: string }) {
  const [filter, setFilter] = useState<Filter>("all");
  const [query, setQuery] = useState("");

  const rows = useMemo(() => toRows(entries), [entries]);
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length };
    rows.forEach((r) => (c[r.filter] = (c[r.filter] ?? 0) + 1));
    return c;
  }, [rows]);

  const q = query.trim().toLowerCase();
  const shown = rows.filter(
    (r) =>
      (filter === "all" || r.filter === filter) &&
      (!q || `${r.tag} ${r.title} ${r.note ?? ""} ${r.details ?? ""}`.toLowerCase().includes(q))
  );

  // Группировка по игровому дню; записи без времени (старые) — к предыдущему дню
  const groups: { day: string; rows: (Row & { n: number })[] }[] = [];
  let lastDay = "";
  shown.forEach((r) => {
    const day = typeof r.gm === "number" ? dayLabel(gameDate(r.gm)) : lastDay || "Без даты";
    lastDay = day;
    if (!groups.length || groups[groups.length - 1].day !== day) groups.push({ day, rows: [] });
    groups[groups.length - 1].rows.push({ ...r, n: rows.indexOf(r) + 1 });
  });

  return (
    <div className="journal">
      <header className="journal-head">
        <div className="journal-case">Дело № {caseNumber}</div>
        <h2 className="journal-title">Ежедневник</h2>
        <p className="journal-sub">Всё, что сделано по делу, — по дням и часам.</p>
      </header>

      <div className="journal-filters" role="tablist">
        {FILTERS.filter((f) => f.id === "all" || counts[f.id]).map((f) => (
          <button
            key={f.id}
            role="tab"
            aria-selected={filter === f.id}
            className={`journal-filter${filter === f.id ? " is-active" : ""}`}
            onClick={() => setFilter(f.id)}
          >
            {f.label}
            <span className="journal-filter-count">{counts[f.id] ?? 0}</span>
          </button>
        ))}
      </div>

      <div className="journal-page">
        <input
          className="journal-search"
          type="search"
          placeholder="Поиск: имя, место, улика, слово…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
        />

        {rows.length === 0 && <p className="journal-empty">Пока пусто. Записи появятся, как только начнёте работать по делу.</p>}
        {rows.length > 0 && shown.length === 0 && <p className="journal-empty">Ничего не нашлось.</p>}

        {groups.map((g) => (
          <section key={g.day + g.rows[0].key} className="journal-day">
            <h3 className="journal-day-title">{g.day}</h3>
            <ol className="journal-list">
              {g.rows.map((r) => {
                const body = (
                  <>
                    <span className="journal-n">{r.n}.</span>
                    <span className="journal-time">{typeof r.gm === "number" ? clockLabel(gameDate(r.gm)) : "—"}</span>
                    <span className={`journal-tag${r.accent ? ` is-${r.accent}` : ""}`}>{r.tag}</span>
                    <span className="journal-text">
                      <span className="journal-main">{tp(r.title)}</span>
                      {r.note && <span className="journal-note"> · {r.note}</span>}
                    </span>
                  </>
                );
                return (
                  <li key={r.key} className={`journal-item is-${r.filter}`}>
                    {r.details ? (
                      <details>
                        <summary className="journal-row">
                          {body}
                          <span className="journal-more" aria-hidden="true" />
                        </summary>
                        <RichText text={r.details} className="journal-details" />
                      </details>
                    ) : (
                      <div className="journal-row">{body}</div>
                    )}
                  </li>
                );
              })}
            </ol>
          </section>
        ))}
      </div>
    </div>
  );
}
