import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/**
 * POST /api/games/:sessionId/accusation/accomplices
 * body: { answers: { characterId: string; optionIndex: number }[] }
 *
 * Этап 2 экрана "Обвинение": по каждому сообщнику из case_accusation.accomplices
 * игрок выбирает один вариант ответа. Верно, если для КАЖДОГО сообщника выбранный
 * option.correct === true. Ответ — только { correct }, а ending_text отдаётся
 * ТОЛЬКО при полном успехе (иначе спойлерит развязку раньше времени).
 * При успехе партия помечается завершённой — дальше геймплея нет.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { answers } = (await req.json()) as {
    answers?: { characterId: string; optionIndex: number }[];
  };
  const db = supabaseAdmin();
  const { sessionId } = params;

  const { data: session, error: sessionError } = await db
    .from("game_sessions")
    .select("purchase_id")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Партия не найдена" }, { status: 404 });
  }

  const { data: state, error: stateError } = await db
    .from("session_state")
    .select("collected_evidence, viewed_reactions")
    .eq("session_id", sessionId)
    .single();

  if (stateError || !state) {
    return NextResponse.json({ error: "Состояние партии не найдено" }, { status: 404 });
  }

  const { data: purchase } = await db
    .from("purchases")
    .select("case_id")
    .eq("id", session.purchase_id)
    .single();

  const { data: accusation } = await db
    .from("case_accusation")
    .select("required_evidence_ids, accomplices, ending_text")
    .eq("case_id", purchase?.case_id ?? "00000000-0000-0000-0000-000000000000")
    .maybeSingle();

  if (!accusation) {
    return NextResponse.json({ error: "Финал для этого дела не настроен" }, { status: 404 });
  }

  const viewedReactions: string[] = state.viewed_reactions ?? [];
  const accomplices: {
    character_id: string;
    options: { label: string; correct: boolean }[];
    required_reaction_evidence_id: string;
  }[] = accusation.accomplices ?? [];
  const requiredEvidenceIds: string[] = accusation.required_evidence_ids ?? [];

  const unlocked =
    requiredEvidenceIds.every((id) => state.collected_evidence.includes(id)) &&
    accomplices.every((acc) =>
      viewedReactions.includes(`${acc.character_id}:${acc.required_reaction_evidence_id}`)
    );

  if (!unlocked) {
    return NextResponse.json({ error: "Обвинение пока недоступно" }, { status: 403 });
  }

  const submittedAnswers = answers ?? [];
  const correct =
    accomplices.length > 0 &&
    accomplices.every((acc) => {
      const answer = submittedAnswers.find((a) => a.characterId === acc.character_id);
      if (!answer) return false;
      return acc.options[answer.optionIndex]?.correct === true;
    });

  if (!correct) {
    return NextResponse.json({ correct: false });
  }

  await db
    .from("game_sessions")
    .update({ status: "finished", finished_at: new Date().toISOString() })
    .eq("id", sessionId);

  return NextResponse.json({ correct: true, endingText: accusation.ending_text });
}
