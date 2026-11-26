/**
 * Перемещения персонажей по ходу дела: после события человек находится
 * в другом месте (там его и допрашивают):
 * - после звонка шефа «Мамаджанов задержан» Фархад — в ГУВД;
 * - после признания Олжаса (его задерживают в общежитии) Олжас — в ГУВД.
 */
const GUVD = "006a31f4-baeb-5b53-9a87-6a397ba18362";

type Relocation = { characterId: string; toLocationId: string; afterCallId?: string; afterEvidenceId?: string };

const RELOCATIONS: Relocation[] = [
  {
    characterId: "5b4c1ece-ba00-50d6-9113-73e03e05ccd8", // Фархад Мамаджанов
    toLocationId: GUVD,
    afterCallId: "a9349cc1-fa86-51b9-9a9b-009f15f0cbde", // внутренний телефон: «Мамаджанов задержан»
  },
  {
    characterId: "ea6167fb-4eea-5e08-ae65-e5fce24e6a6c", // Олжас Бекенов
    toLocationId: GUVD,
    afterEvidenceId: "0146fe89-1029-5d65-87bb-f750dfe7ad2d", // «Признание Олжаса»
  },
];

/** Где человек сейчас с учётом событий партии. */
export function effectiveLocationId(
  characterId: string,
  baseLocationId: string | null | undefined,
  viewedCalls: string[] | null | undefined,
  collectedEvidence?: string[] | null
): string | null {
  const calls = viewedCalls ?? [];
  const ev = collectedEvidence ?? [];
  const move = RELOCATIONS.filter(
    (r) =>
      r.characterId === characterId &&
      ((r.afterCallId && calls.includes(r.afterCallId)) || (r.afterEvidenceId && ev.includes(r.afterEvidenceId)))
  ).pop();
  return move ? move.toLocationId : baseLocationId ?? null;
}
