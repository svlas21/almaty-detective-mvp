/**
 * Подсчёт итогового счёта. Считается ТОЛЬКО на сервере (см. Техдок, разд. 4, шаг 8) —
 * клиент никогда не видит и не пересчитывает формулу сам.
 *
 * MVP-версия: чем быстрее и точнее раскрыто дело — тем выше балл.
 * correctAnswers / totalQuestions — доля правильно доказанных выводов.
 * elapsedMinutes — суммарное игровое время (см. TIME_COSTS ниже).
 *
 * Формула — заглушка на старте, донастраивается после первых плейтестов
 * (см. рекомендацию по плейтесту в чек-листе запуска).
 */
export const TIME_COSTS = {
  INTERROGATE_OR_INSPECT: 5, // сканирование улики / вопрос персонажу / осмотр = 5 игровых минут
  TRAVEL_BETWEEN_LOCATIONS: 20, // переход между районами = 20 игровых минут
} as const;

const BASE_SCORE = 1000;
const TIME_PENALTY_PER_MINUTE = 2;

export function calculateScore(params: {
  correctAnswers: number;
  totalQuestions: number;
  elapsedMinutes: number;
}): number {
  const { correctAnswers, totalQuestions, elapsedMinutes } = params;

  if (totalQuestions === 0) return 0;

  const accuracy = correctAnswers / totalQuestions;
  const timePenalty = elapsedMinutes * TIME_PENALTY_PER_MINUTE;

  const score = Math.round(BASE_SCORE * accuracy - timePenalty);
  return Math.max(score, 0);
}
