/**
 * Итог раскрытого дела: счёт из 100, звание и цифры для карточки «Поделиться».
 * Считается на сервере из журнала партии (session_state.log) — клиент только показывает.
 *
 * Из чего складываются 100 очков:
 *  - Обвинение (организатор) — 40: каждая возвращённая прокурором попытка −15 (не меньше 10).
 *  - Соучастники — 30: каждая неверная попытка −10 (не меньше 5).
 *  - Выезды — 20: эталонный маршрут REF_TRIPS выездов; каждый лишний −2 (не меньше 0).
 *  - Улики — 10: доля собранных улик дела.
 */
export const REF_TRIPS = 12;

type LogEntry = { type?: string; stage?: string; correct?: boolean };

export type CaseResult = {
  score: number;
  rank: string;
  stars: number; // 1..5 — звёздочки на погонах
  parts: { label: string; points: number; max: number }[];
  stats: {
    gameMinutes: number;
    trips: number;
    refTrips: number;
    organizerAttempts: number;
    accompliceAttempts: number;
    evidenceFound: number;
    evidenceTotal: number;
  };
};

const RANKS: { min: number; title: string; stars: number }[] = [
  { min: 95, title: "Полковник угрозыска", stars: 5 },
  { min: 85, title: "Майор", stars: 4 },
  { min: 70, title: "Капитан", stars: 3 },
  { min: 50, title: "Старший лейтенант", stars: 2 },
  { min: 0, title: "Стажёр", stars: 1 },
];

export function computeResult(params: {
  log: LogEntry[];
  gameMinutes: number;
  evidenceFound: number;
  evidenceTotal: number;
}): CaseResult {
  const log = params.log ?? [];
  const accuse = log.filter((e) => e.type === "accuse");
  const organizerAttempts = Math.max(1, accuse.filter((e) => e.stage === "organizer").length);
  const accompliceAttempts = Math.max(1, accuse.filter((e) => e.stage === "accomplices").length);
  const trips = log.filter((e) => e.type === "travel").length;

  const organizer = Math.max(10, 40 - 15 * (organizerAttempts - 1));
  const accomplices = Math.max(5, 30 - 10 * (accompliceAttempts - 1));
  const travel = Math.max(0, 20 - 2 * Math.max(0, trips - REF_TRIPS));
  const evidence = params.evidenceTotal > 0 ? Math.round((10 * params.evidenceFound) / params.evidenceTotal) : 0;
  const score = Math.min(100, organizer + accomplices + travel + evidence);
  const rank = RANKS.find((r) => score >= r.min) ?? RANKS[RANKS.length - 1];

  return {
    score,
    rank: rank.title,
    stars: rank.stars,
    parts: [
      { label: "Обвинение", points: organizer, max: 40 },
      { label: "Соучастники", points: accomplices, max: 30 },
      { label: "Выезды", points: travel, max: 20 },
      { label: "Улики", points: evidence, max: 10 },
    ],
    stats: {
      gameMinutes: params.gameMinutes,
      trips,
      refTrips: REF_TRIPS,
      organizerAttempts,
      accompliceAttempts,
      evidenceFound: params.evidenceFound,
      evidenceTotal: params.evidenceTotal,
    },
  };
}

/** «1 сут. 6 ч» / «5 ч 40 мин» — срок следствия по игровым часам. */
export function formatTerm(minutes: number): string {
  const d = Math.floor(minutes / 1440);
  const h = Math.floor((minutes % 1440) / 60);
  const m = minutes % 60;
  if (d > 0) return `${d} сут. ${h} ч`;
  if (h > 0) return m ? `${h} ч ${m} мин` : `${h} ч`;
  return `${m} мин`;
}

export function attemptsLabel(n: number): string {
  if (n <= 1) return "с первого раза";
  return `с ${n}-й попытки`;
}
