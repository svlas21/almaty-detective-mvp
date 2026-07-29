import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/**
 * POST /api/games/:sessionId/suspects/:characterId/question-viewed
 * body: { questionIndex: number }
 *
 * Точечная выдача улики по конкретному вопросу протокола допроса (Дело №9704) —
 * в отличие от .../interrogated (весь протокол дочитан), это срабатывает, как
 * только игрок раскрыл ОДИН конкретный вопрос. Сервер сам смотрит
 * fixed_questions[questionIndex].grants_evidence_id, а не доверяет evidenceId
 * от клиента. Вопрос без этого поля — не ошибка, просто no-op.
 * Сосуществует с granted_by_character_id: один вопрос может выдавать улику
 * досрочно, а остальные granted_by-улики того же персонажа всё равно ждут
 * полного прочтения протокола.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string; characterId: string } }
) {
  const { questionIndex } = (await req.json()) as { questionIndex?: number };
  const db = supabaseAdmin();
  const { sessionId, characterId } = params;

  if (typeof questionIndex !== "number") {
    return NextResponse.json({ error: "questionIndex обязателен" }, { status: 400 });
  }

  const { data: character, error: characterError } = await db
    .from("characters")
    .select("case_id, fixed_questions")
    .eq("id", characterId)
    .single();

  if (characterError || !character) {
    return NextResponse.json({ error: "Подозреваемый не найден" }, { status: 404 });
  }

  const question = (character.fixed_questions ?? [])[questionIndex] as
    | { grants_evidence_id?: string }
    | undefined;
  const grantsEvidenceId = question?.grants_evidence_id;

  if (!grantsEvidenceId) {
    return NextResponse.json({ ok: true });
  }

  const { data: grantedEvidence } = await db
    .from("evidence")
    .select("id")
    .eq("case_id", character.case_id)
    .eq("id", grantsEvidenceId)
    .maybeSingle();

  if (!grantedEvidence) {
    return NextResponse.json({ ok: true });
  }

  const { data: state, error: stateError } = await db
    .from("session_state")
    .select("discovered_evidence, collected_evidence")
    .eq("session_id", sessionId)
    .single();

  if (stateError || !state) {
    return NextResponse.json({ error: "Партия не найдена" }, { status: 404 });
  }

  const merge = (existing: string[], added: string[]) =>
    Array.from(new Set([...existing, ...added]));

  const { error: updateError } = await db
    .from("session_state")
    .update({
      discovered_evidence: merge(state.discovered_evidence ?? [], [grantedEvidence.id]),
      collected_evidence: merge(state.collected_evidence ?? [], [grantedEvidence.id]),
    })
    .eq("session_id", sessionId);

  if (updateError) {
    return NextResponse.json({ error: "Не удалось выдать улику" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
