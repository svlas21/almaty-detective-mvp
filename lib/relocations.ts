/**
 * Перемещения персонажей по ходу дела: после события человек находится
 * в другом месте (там его и допрашивают). Пока одно правило:
 * после звонка шефа «Мамаджанов задержан» Фархад — в ГУВД.
 */
const GUVD = "006a31f4-baeb-5b53-9a87-6a397ba18362";

const RELOCATIONS: { characterId: string; toLocationId: string; afterCallId: string }[] = [
  {
    characterId: "5b4c1ece-ba00-50d6-9113-73e03e05ccd8", // Фархад Мамаджанов
    toLocationId: GUVD,
    afterCallId: "a9349cc1-fa86-51b9-9a9b-009f15f0cbde", // внутренний телефон: «Мамаджанов задержан»
  },
];

/** Где человек сейчас с учётом событий партии. */
export function effectiveLocationId(
  characterId: string,
  baseLocationId: string | null | undefined,
  viewedCalls: string[] | null | undefined
): string | null {
  const calls = viewedCalls ?? [];
  const move = RELOCATIONS.filter((r) => r.characterId === characterId && calls.includes(r.afterCallId)).pop();
  return move ? move.toLocationId : baseLocationId ?? null;
}
