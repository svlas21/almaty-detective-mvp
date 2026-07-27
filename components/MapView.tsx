"use client";

import { useState } from "react";

export interface MapPoint {
  id: string;
  name: string;
  x: number;
  y: number;
  previewImageUrl?: string | null;
  shortDescription?: string | null;
  unlocked: boolean;
}

interface MapViewProps {
  imageUrl: string;
  points: MapPoint[];
  onVisit: (locationId: string) => void;
}

export default function MapView({ imageUrl, points, onVisit }: MapViewProps) {
  const [selected, setSelected] = useState<MapPoint | null>(null);

  return (
    <>
      <div style={{ position: "relative", width: "100%", borderRadius: 8, overflow: "hidden" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={imageUrl} alt="Карта дела" style={{ width: "100%", display: "block" }} />

        {points.map((p) => (
          <button
            key={p.id}
            onClick={() => setSelected(p)}
            title={p.unlocked ? p.name : "Локация ещё не обнаружена"}
            style={{
              position: "absolute",
              left: `${p.x}%`,
              top: `${p.y}%`,
              transform: "translate(-50%, -50%)",
              width: 22,
              height: 22,
              borderRadius: "50%",
              border: p.unlocked ? "3px solid white" : "2px solid rgba(255,255,255,0.25)",
              background: p.unlocked ? "rgba(181, 69, 27, 0.9)" : "rgba(120,120,120,0.6)",
              cursor: "pointer",
              boxShadow: p.unlocked ? "0 0 0 4px rgba(0,0,0,0.35)" : "0 0 0 4px rgba(0,0,0,0.2)",
            }}
          />
        ))}
      </div>

      {selected && (
        <div
          onClick={() => setSelected(null)}
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: "rgba(0,0,0,0.72)",
            backdropFilter: "blur(2px)",
            WebkitBackdropFilter: "blur(2px)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              position: "relative",
              background: "#1a1d24",
              border: "1px solid #2a2e37",
              borderRadius: 12,
              padding: 0,
              width: 300,
              overflow: "hidden",
              boxShadow: "0 20px 50px rgba(0,0,0,0.5)",
            }}
          >
            <button onClick={() => setSelected(null)} title="Закрыть" className="map-popup-close">
              ×
            </button>

            {selected.unlocked ? (
              <>
                {selected.previewImageUrl && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={selected.previewImageUrl}
                    alt={selected.name}
                    style={{ width: "100%", aspectRatio: "16 / 10", objectFit: "cover", display: "block" }}
                  />
                )}
                <div style={{ padding: "18px 20px 20px" }}>
                  <div
                    style={{
                      fontSize: 11,
                      letterSpacing: "0.08em",
                      textTransform: "uppercase",
                      color: "#b5451b",
                      fontWeight: 600,
                      marginBottom: 4,
                    }}
                  >
                    Место
                  </div>
                  <div style={{ fontSize: 19, fontWeight: 600, marginBottom: 8, lineHeight: 1.25 }}>
                    {selected.name}
                  </div>
                  {selected.shortDescription && (
                    <p style={{ fontSize: 13.5, lineHeight: 1.5, color: "#9ca3af", marginBottom: 16 }}>
                      {selected.shortDescription}
                    </p>
                  )}
                  <button
                    className="btn"
                    style={{
                      width: "100%",
                      padding: "12px 20px",
                      fontSize: 15,
                      fontWeight: 600,
                      borderRadius: 8,
                      transition: "background 0.15s ease",
                    }}
                    onClick={() => onVisit(selected.id)}
                  >
                    <span style={{ marginRight: 6 }}>🚔</span>
                    Выехать на место
                  </button>
                </div>
              </>
            ) : (
              <div style={{ padding: "18px 20px 20px" }}>
                <p className="muted" style={{ margin: 0 }}>Локация ещё не обнаружена</p>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}