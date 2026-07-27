"use client";

import type { SuspectListItem } from "@/components/SuspectsList";

interface ExpertsListProps {
  experts: SuspectListItem[];
  onSelect: (expert: SuspectListItem) => void;
}

export default function ExpertsList({ experts, onSelect }: ExpertsListProps) {
  return (
    <>
      <div className="people-sheet-tab-row">
        <span className="people-sheet-tab">Экспертно-консультативная служба</span>
      </div>
      <div className="people-sheet-card">
        <div className="people-sheet-header">
          <span>
            Эксперты <span className="people-sheet-count">· {experts.length}</span>
          </span>
        </div>

        {experts.length === 0 ? (
          <p className="muted">Эксперты по этому делу пока не назначены.</p>
        ) : (
          <div className="people-slip-list">
            {experts.map((expert) => (
              <div key={expert.id} className="people-slip" onClick={() => onSelect(expert)}>
                <div className="people-slip-photo-wrap">
                  <div className="people-slip-clip" />
                  {expert.portrait_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={expert.portrait_url}
                      alt={expert.name ?? ""}
                      className="people-slip-photo"
                    />
                  ) : (
                    <div className="people-slip-photo-fallback">
                      {(expert.name ?? "")
                        .split(" ")
                        .filter(Boolean)
                        .slice(0, 2)
                        .map((part) => part[0])
                        .join("")
                        .toUpperCase()}
                    </div>
                  )}
                </div>

                <div className="people-slip-info">
                  <p className="people-slip-name">{expert.name}</p>
                  {expert.specialization && (
                    <p className="people-slip-role">{expert.specialization}</p>
                  )}
                </div>

                <div className="people-slip-side">
                  <span className="people-slip-cta">ЗАПРОСИТЬ →</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
