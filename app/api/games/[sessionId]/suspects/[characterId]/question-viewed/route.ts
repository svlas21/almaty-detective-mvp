import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { gameMinutes, stamp } from "@/lib/journal";
import { requireOnSite } from "@/lib/onSite";

export const dynamic = "force-dynamic";

/**
 * POST /api/games/:sessionId/suspects/:characterId/question-viewed
 * body: { questionIndex: number }
 *
 * Отмечает точечный просмотр ОДНОГО конкретного вопроса протокола допроса —
 * ключ "characterId:questionIndex" в session_state.viewed_questions (тот же
 * паттерн, что viewed_reactions для пар персонаж+улика, см.
 * supabase/010_viewed_questions.sql). На этом сигнале строятся условные
 * открытия тем "Спросить про..." на уровне конкретного вопроса, а не всей
 * карточки персонажа (см. topics.unlock_question_character_id/
 * unlock_question_index, state/route.ts, ask/route.ts).
 *
 * Заодно (Дело №9704) — точечная выдача улики, если у вопроса задан
 * grants_evidence_id: в отличие от .../interrogated (весь протокол
 * дочитан), это срабатывает сразу по раскрытию ОДНОГО вопроса. Вопрос без
 * этого поля — не ошибка, просто нет гранта. Сосуществует с
 * granted_by_character_id: один вопрос может выдавать улику досрочно, а
 * остальные granted_by-улики того же персонажа всё равно ждут полного
 * прочтения протокола.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string; characterId: string } }
) {
  const { questionIndex } = (await req.json()) as { questionIndex?: number };
  const db = supabaseAdmin();
  const { sessionId, characterId } = params;
  // Игровое время для ежедневника — параллельно с остальными запросами
  const gmPromise = gameMinutes(db, sessionId);

  if (typeof questionIndex !== "number") {
    return NextResponse.json({ error: "questionIndex обязателен" }, { status: 400 });
  }

  const [offSite, characterRes, stateRes] = await Promise.all([
    requireOnSite(db, sessionId, characterId),
    db.from("characters").select("case_id, name, fixed_questions").eq("id", characterId).single(),
    db
      .from("session_state")
      .select("discovered_evidence, collected_evidence, viewed_questions, log")
      .eq("session_id", sessionId)
      .single(),
  ]);
  if (offSite) return offSite;
  const { data: character, error: characterError } = characterRes;

  if (characterError || !character) {
    return NextResponse.json({ error: "Подозреваемый не найден" }, { status: 404 });
  }

  const { data: state, error: stateError } = stateRes;

  if (stateError || !state) {
    return NextResponse.json({ error: "Партия не найдена" }, { status: 404 });
  }

  const merge = (existing: string[], added: string[]) =>
    Array.from(new Set([...existing, ...added]));

  const viewedQuestions = merge(state.viewed_questions ?? [], [`${characterId}:${questionIndex}`]);

  const question = (character.fixed_questions ?? [])[questionIndex] as
    | { q?: string; a?: string; grants_evidence_id?: string }
    | undefined;
  const firstView = !(state.viewed_questions ?? []).includes(`${characterId}:${questionIndex}`);
  const grantsEvidenceId = question?.grants_evidence_id;

  let discoveredEvidence = state.discovered_evidence ?? [];
  let collectedEvidence = state.collected_evidence ?? [];
  // Журнал расследования (Дело №9704): улика, выданная точечным вопросом
  // протокола, тоже должна оставить след в журнале — без этого раскрытие
  // ответа с грантом проходило вообще без записи в log.
  // Ежедневник: каждый впервые прочитанный вопрос протокола — отдельная запись.
  const newEntries: Record<string, unknown>[] = [];
  if (firstView && question?.q) {
    newEntries.push({
      type: "question",
      characterName: character.name,
      question: question.q,
      answerText: question.a ?? "",
      at: new Date().toISOString(),
    });
  }

  if (grantsEvidenceId) {
    const { data: grantedEvidence } = await db
      .from("evidence")
      .select("id, name")
      .eq("case_id", character.case_id)
      .eq("id", grantsEvidenceId)
      .maybeSingle();

    if (grantedEvidence) {
      discoveredEvidence = merge(discoveredEvidence, [grantedEvidence.id]);
      collectedEvidence = merge(collectedEvidence, [grantedEvidence.id]);
      newEntries.push({
        type: "evidence",
        outcome: "found",
        evidenceName: grantedEvidence.name,
        source: character.name,
        at: new Date().toISOString(),
      });
    }
  }

  const log = newEntries.length
    ? [...(state.log ?? []), ...stamp(newEntries, await gmPromise)]
    : state.log ?? [];

  const { error: updateError } = await db
    .from("session_state")
    .update({
      viewed_questions: viewedQuestions,
      discovered_evidence: discoveredEvidence,
      collected_evidence: collectedEvidence,
      log,
    })
    .eq("session_id", sessionId);

  if (updateError) {
    return NextResponse.json({ error: "Не удалось отметить вопрос" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
