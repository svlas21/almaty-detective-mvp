"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import PanoramaViewer from "@/components/PanoramaViewer";
import EvidenceSearch from "@/components/EvidenceSearch";
import MapView from "@/components/MapView";
import Sidebar, { SidebarTab } from "@/components/Sidebar";
import Loader from "@/components/Loader";
import SuspectsList, { SuspectListItem } from "@/components/SuspectsList";
import ExpertsList from "@/components/ExpertsList";
import SuspectDetail from "@/components/SuspectDetail";
import IntroScreen from "@/components/IntroScreen";
import AccusationScreen from "@/components/AccusationScreen";
import PhoneCallOverlay, { PendingCall } from "@/components/PhoneCallOverlay";
import { getEvidenceIcon } from "@/lib/evidenceIcons";

const PLACEHOLDER_PANORAMA = "https://pannellum.org/images/alma.jpg";

interface UnlockedLocation {
  id: string;
  name: string;
  image_url: string | null;
  map_pos_x: number;
  map_pos_y: number;
  preview_image_url: string | null;
  short_description: string | null;
  is_searchable: boolean;
  unlocked: true;
}

interface LockedLocation {
  id: string;
  map_pos_x: number;
  map_pos_y: number;
  unlocked: false;
}

type MapLocation = UnlockedLocation | LockedLocation;

interface LogEntry {
  type: string;
  text: string;
  at: string;
}

interface CollectedEvidenceItem {
  id: string;
  name: string;
  description: string | null;
  generic_category?: string | null;
}

interface StateResponse {
  session: { elapsed_minutes: number; status: string; intro_seen: boolean };
  location: {
    id: string;
    name: string;
    image_url: string | null;
    short_description: string | null;
    is_searchable: boolean;
  } | null;
  allLocations: MapLocation[];
  allSuspects: SuspectListItem[];
  experts: SuspectListItem[];
  motherUnlocked: boolean;
  accusationUnlocked: boolean;
  pendingCall: PendingCall | null;
  mapImageUrl: string | null;
  collectedEvidence: CollectedEvidenceItem[];
  log: LogEntry[];
}

interface EvidencePoolItem {
  id: string;
  name: string;
}

function formatTime(minutes: number) {
  const h = Math.floor(minutes / 60).toString().padStart(2, "0");
  const m = (minutes % 60).toString().padStart(2, "0");
  return `${h}:${m}`;
}

export default function GameScreen() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const [state, setState] = useState<StateResponse | null>(null);
  const [pool, setPool] = useState<EvidencePoolItem[]>([]);
  const [triedIds, setTriedIds] = useState<Set<string>>(new Set());
  const [lastResult, setLastResult] = useState<{ name: string; text: string; relevant: boolean } | null>(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<SidebarTab>("map");
  const [mapView, setMapView] = useState<"map" | "location">("map");
  const [locationPhase, setLocationPhase] = useState<"hub" | "warning" | "searching" | "timeout">("hub");
  const [secondsLeft, setSecondsLeft] = useState(40);
  const [panoramaReady, setPanoramaReady] = useState(false);
  const [selectedSuspect, setSelectedSuspect] = useState<SuspectListItem | null>(null);
  const [suspectReaction, setSuspectReaction] = useState<{ evidenceName: string; text: string } | null>(null);
  const [suspectConfession, setSuspectConfession] = useState<string | null>(null);
  const [presentingEvidenceId, setPresentingEvidenceId] = useState<string | null>(null);
  const [navigating, setNavigating] = useState(false);

  async function loadState(options?: { silent?: boolean }) {
    if (!options?.silent) setLoading(true);
    const res = await fetch(`/api/games/${sessionId}/state`);
    let data: StateResponse | null = null;
    if (res.ok) {
      data = await res.json();
      setState(data);
    }
    if (!options?.silent) setLoading(false);
    return data;
  }

  async function loadPool() {
    const res = await fetch(`/api/games/${sessionId}/evidence/pool`);
    if (res.ok) {
      const data = await res.json();
      setPool(data.pool);
    }
  }

  useEffect(() => {
    if (sessionId) {
      loadState();
      loadPool();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [sessionId]);

  useEffect(() => {
    if (locationPhase !== "searching" || !panoramaReady) return;
    if (secondsLeft <= 0) {
      setLocationPhase("timeout");
      return;
    }
    const timer = setTimeout(() => setSecondsLeft((s) => s - 1), 1000);
    return () => clearTimeout(timer);
  }, [locationPhase, secondsLeft, panoramaReady]);

  async function visitLocation(locationId: string) {
    setNavigating(true);
    try {
      if (state?.location?.id !== locationId) {
        await fetch(`/api/games/${sessionId}/travel`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ locationId }),
        });
      }
      setTriedIds(new Set());
      setLastResult(null);
      // Данные новой локации грузятся ДО переключения экрана — иначе hub
      // на миг рендерится с state.location от предыдущей локации (race
      // condition: экран уже "location", а state ещё старый).
      await loadState({ silent: true });
      await loadPool();
      setMapView("location");
      setLocationPhase("hub");
    } finally {
      setNavigating(false);
    }
  }

  function startSearch() {
    setLocationPhase("searching");
    setSecondsLeft(40);
    setPanoramaReady(false);
  }

  async function guessEvidence(evidenceId: string) {
    const guessedItem = pool.find((p) => p.id === evidenceId);
    const res = await fetch(`/api/games/${sessionId}/evidence/check`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evidenceId }),
    });
    if (res.ok) {
      const data = await res.json();
      setLastResult({
        name: guessedItem?.name ?? "",
        text: data.relevant ? data.description : data.message,
        relevant: data.relevant,
      });
      setTriedIds((prev) => new Set(prev).add(evidenceId));
      loadState({ silent: true });
    }
  }

  async function openSuspect(person: SuspectListItem) {
    setNavigating(true);
    try {
      setSuspectReaction(null);
      setSuspectConfession(null);
      await fetch(`/api/games/${sessionId}/suspects/${person.id}/view`, { method: "POST" });
      await loadState({ silent: true });
      setSelectedSuspect(person);
    } finally {
      setNavigating(false);
    }
  }

  async function completeInterrogation(characterId: string) {
    await fetch(`/api/games/${sessionId}/suspects/${characterId}/interrogated`, { method: "POST" });
    await loadState({ silent: true });
  }

  async function questionViewed(characterId: string, questionIndex: number) {
    await fetch(`/api/games/${sessionId}/suspects/${characterId}/question-viewed`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ questionIndex }),
    });
    await loadState({ silent: true });
  }

  async function presentEvidenceToSuspect(evidence: CollectedEvidenceItem) {
    if (!selectedSuspect) return;
    setPresentingEvidenceId(evidence.id);
    const res = await fetch(`/api/games/${sessionId}/suspects/${selectedSuspect.id}/present`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ evidenceId: evidence.id }),
    });
    if (res.ok) {
      const data = await res.json();
      setSuspectReaction({ evidenceName: evidence.name, text: data.reaction });
      if (data.confession) setSuspectConfession(data.confession);
      await loadState({ silent: true });
    }
    setPresentingEvidenceId(null);
  }

  async function answerCall(callId: string) {
    await fetch(`/api/games/${sessionId}/calls/${callId}/answer`, { method: "POST" });
  }

  async function closeCall() {
    await loadState({ silent: true });
  }

  async function handleIntroFinish(characterId: string) {
    setNavigating(true);
    try {
      await fetch(`/api/games/${sessionId}/intro/complete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ characterId }),
      });
      await loadState({ silent: true });
      // После брифинга игрок сразу внутри ГУВД (хаб), а не на карте дела —
      // тот же экран, что открывается кнопкой "Выехать на место".
      setMapView("location");
      setLocationPhase("hub");
    } finally {
      setNavigating(false);
    }
  }

  if (loading) return <Loader />;
  if (!state) return <div className="container">Партия не найдена.</div>;

  if (!state.session.intro_seen) {
    if (navigating) {
      return (
        <div className="container">
          <Loader />
        </div>
      );
    }

    const introCharacter = state.allSuspects.find(
      (s) => s.unlocked && s.name === "Азамат Нурланович"
    );
    return (
      <div className="container">
        {introCharacter && (
          <IntroScreen character={introCharacter} onFinish={() => handleIntroFinish(introCharacter.id)} />
        )}
      </div>
    );
  }

  return (
    <div className="game-shell">
      {state.pendingCall && (
        <PhoneCallOverlay
          call={state.pendingCall}
          onAnswer={() => answerCall(state.pendingCall!.id)}
          onClose={closeCall}
        />
      )}

      <Sidebar active={tab} onChange={setTab} accusationUnlocked={state.accusationUnlocked} />

      <div className="game-main">
        <div className="timer-badge">
          <div className="value">{formatTime(state.session.elapsed_minutes)}</div>
          <div className="label">игрового времени</div>
        </div>

        {navigating ? (
          <Loader />
        ) : selectedSuspect ? (
          <>
            <button
              className="btn"
              style={{ background: "#384050", marginBottom: 16 }}
              onClick={() => setSelectedSuspect(null)}
            >
              ← Назад к списку
            </button>
            <SuspectDetail
              suspect={selectedSuspect}
              collectedEvidence={state.collectedEvidence}
              reaction={suspectReaction}
              confession={suspectConfession}
              presentingId={presentingEvidenceId}
              onPresent={presentEvidenceToSuspect}
              onInterrogationComplete={completeInterrogation}
              onQuestionViewed={questionViewed}
            />
          </>
        ) : (
          <>
        {tab === "map" && mapView === "map" && (
          <div className="card">
            <h2>Карта дела</h2>
            {state.mapImageUrl ? (
              <MapView
                imageUrl={state.mapImageUrl}
              points={state.allLocations.map((l) => ({
                  id: l.id,
                  name: l.unlocked ? l.name : "???",
                  x: l.map_pos_x,
                  y: l.map_pos_y,
                  previewImageUrl: l.unlocked ? l.preview_image_url : null,
                  shortDescription: l.unlocked ? l.short_description : null,
                  unlocked: l.unlocked,
                }))}
                onVisit={visitLocation}
              />
            ) : (
              <p className="muted">Карта дела ещё не загружена.</p>
            )}
          </div>
        )}

        {tab === "map" && mapView === "location" && locationPhase === "hub" && (
          <>
            <div className="card">
              <h2>{state.location?.name}</h2>
              {state.location?.short_description && (
                <p className="muted">{state.location.short_description}</p>
              )}
            </div>

            <div className="people-sheet-tab-row">
              <span className="people-sheet-tab">Место · {state.location?.name}</span>
            </div>
            <div className="people-sheet-card">
              {(() => {
                // Разыскиваемые (например «Марат») присутствуют по locations_id
                // (учитываются в discovered_characters с момента посещения
                // локации), но недопрашиваемы — protocol/reactions для них не
                // заполнены, допрос по канону невозможен. Их статус уже описан
                // в intro_text локации, отдельная карточка/штамп избыточны —
                // в "Люди здесь" не показываем вовсе.
                const peopleHere = state.allSuspects.filter(
                  (person) =>
                    person.unlocked === true &&
                    person.location_id === state.location?.id &&
                    !person.wanted
                );
                return (
                  <>
                    <div className="people-sheet-header">
                      <span>
                        Люди здесь <span className="people-sheet-count">· {peopleHere.length}</span>
                      </span>
                    </div>

                    {peopleHere.length === 0 ? (
                      <p className="muted">Здесь никого не найдено.</p>
                    ) : (
                      <div className="people-slip-list">
                        {peopleHere.map((person) => {
                          const isValentinaLocked =
                            person.name === "Валентина Сартакова" && !state.motherUnlocked;
                          if (isValentinaLocked) {
                            return (
                              <div key={person.id} className="people-slip people-slip-locked">
                                <div className="people-slip-info">
                                  <p className="people-slip-name">{person.name}</p>
                                  <p className="people-slip-role">
                                    Вернитесь после разговора с Алией Сартаковой
                                  </p>
                                </div>
                              </div>
                            );
                          }
                          const interviewLabel = person.is_suspect ? "Допросить →" : "Говорить →";
                          return (
                            <div
                              key={person.id}
                              className="people-slip"
                              onClick={() => openSuspect(person)}
                            >
                              <div className="people-slip-photo-wrap">
                                <div className="people-slip-clip" />
                                {person.portrait_url ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img
                                    src={person.portrait_url}
                                    alt={person.name ?? ""}
                                    className="people-slip-photo"
                                  />
                                ) : (
                                  <div className="people-slip-photo-fallback">
                                    {(person.name ?? "")
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
                                <p className="people-slip-name">{person.name}</p>
                                {person.role && <p className="people-slip-role">{person.role}</p>}
                              </div>

                              <div className="people-slip-side">
                                {person.is_suspect && person.viewed && (
                                  <span className="people-slip-stamp people-slip-stamp-interviewed">
                                    Опрошен
                                  </span>
                                )}
                                {person.is_suspect && !person.viewed && (
                                  <span className="people-slip-stamp people-slip-stamp-not-interviewed">
                                    Не опрошен
                                  </span>
                                )}
                                <span className="people-slip-cta">{interviewLabel}</span>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="people-sheet-actions">
                      {state.location?.is_searchable && (
                        <button className="people-sheet-search-btn" onClick={startSearch}>
                          🔍 Обыскать место
                        </button>
                      )}
                      <button className="people-sheet-map-btn" onClick={() => setMapView("map")}>
                        🗺 Карта Алматы
                      </button>
                    </div>
                  </>
                );
              })()}
            </div>
          </>
        )}

        {tab === "map" && mapView === "location" && locationPhase === "warning" && (
          <div className="card" style={{ textAlign: "center" }}>
            <h2>⏱ У вас есть 40 секунд на осмотр места преступления</h2>
            <p className="muted">Действуйте быстро и внимательно.</p>
            <div style={{ marginTop: 16, display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="btn" onClick={startSearch}>🔍 Обыскать</button>
              <button className="map-return-btn" onClick={() => setMapView("map")}>
                🗺 Карта Алматы
              </button>
            </div>
          </div>
        )}

        {tab === "map" && mapView === "location" && locationPhase === "searching" && (
          <>
            <button className="map-return-btn" style={{ marginBottom: 16 }} onClick={() => setMapView("map")}>
              🗺 Карта Алматы
            </button>

            <div className="timer-badge" style={{ position: "static", marginBottom: 12, display: "inline-block" }}>
              <div className="value">{panoramaReady ? `${secondsLeft}с` : "…"}</div>
              <div className="label">{panoramaReady ? "осталось на осмотр" : "загружаем панораму"}</div>
            </div>

            <div className="card" style={{ display: "flex", flexDirection: "column", flex: 1 }}>
              <h3>Осмотр места «{state.location?.name}»</h3>
              <PanoramaViewer
                imageUrl={state.location?.image_url || PLACEHOLDER_PANORAMA}
                onReady={() => setPanoramaReady(true)}
              />
            </div>
          </>
        )}

        {tab === "map" && mapView === "location" && locationPhase === "timeout" && (
          <div className="evidence-timeout-card">
            <h2 className="evidence-timeout-title">⏱ Время осмотра истекло</h2>
            <p className="evidence-timeout-subtitle">Вы можете вернуться и осмотреть место ещё раз.</p>

            <EvidenceSearch pool={pool} onGuess={guessEvidence} triedIds={triedIds} />

            {lastResult && (
              <div className={`evidence-result${lastResult.relevant ? " is-relevant" : ""}`}>
                <div className="evidence-result-label">{lastResult.name}</div>
                <p>{lastResult.text}</p>
              </div>
            )}

            <div style={{ marginTop: 20, display: "flex", gap: 12, justifyContent: "center" }}>
              <button className="people-sheet-search-btn" onClick={startSearch}>
                🔍 Осмотреть снова
              </button>
              <button className="map-return-btn" onClick={() => setMapView("map")}>
                🗺 Карта Алматы
              </button>
            </div>
          </div>
        )}

        {tab === "suspects" && <SuspectsList suspects={state.allSuspects} onSelect={openSuspect} />}

        {tab === "expertise" && <ExpertsList experts={state.experts} onSelect={openSuspect} />}

        {tab === "evidence" && (
          <>
            <div className="evidence-folder-header">
              <span className="evidence-folder-tab">Дело №9704 · Вещественные доказательства</span>
              <span className="evidence-folder-count">
                Приобщено: <strong>{state.collectedEvidence.length}</strong>
              </span>
            </div>

            {state.collectedEvidence.length === 0 ? (
              <div className="evidence-doc evidence-doc-empty">
                <div className="dossier-evidence-empty-icon" />
                <span>Пока ничего не найдено — осмотрите локации.</span>
              </div>
            ) : (
              <div className="evidence-doc-list">
                {state.collectedEvidence.map((e) => {
                  const Icon = getEvidenceIcon(e);
                  return (
                    <div key={e.id} className="evidence-doc">
                      <div className="evidence-doc-body">
                        <h3 className="evidence-doc-name">
                          <Icon className="evidence-doc-icon" strokeWidth={1.75} aria-hidden />
                          {e.name}
                        </h3>
                        <p className="evidence-doc-description">{e.description}</p>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {tab === "accuse" && state.accusationUnlocked && (
          <AccusationScreen sessionId={sessionId} collectedEvidence={state.collectedEvidence} />
        )}

        {tab === "log" && (
          <div className="card">
            <h2>Журнал действий</h2>
            {state.log.length === 0 && <p className="muted">Пока пусто.</p>}
            {[...state.log].reverse().map((entry, i) => (
              <div key={i} className="log-entry">
                <div className="time">
                  {new Date(entry.at).toLocaleTimeString("ru-RU")}
                </div>
                {entry.text}
              </div>
            ))}
          </div>
        )}

        {tab === "help" && (
          <div className="card">
            <h2>Как играть</h2>
            <p>1. На карте кликайте открытые точки → «Осмотреть».</p>
            <p>2. На месте нажмите «Да» на вопрос про улики и выбирайте варианты из облака.</p>
            <p>3. Собранные улики смотрите во вкладке «Улики».</p>
            <p>4. Когда будете готовы — переходите в «Обвинение» (скоро).</p>
          </div>
        )}
          </>
        )}
      </div>
    </div>
  );
}