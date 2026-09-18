import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/**
 * POST /api/games/:sessionId/accusation/accomplices
 * body: { answers: { characterId: string; optionIndex: number }[] }
 *
 * Этап 2 экрана "Обвинение": по каждому сообщнику из case_accusation.accomplices
 * игрок выбирает один вариант ответа. Верно, если для КАЖДОГО сообщника выбранный
 * option.correct === true И игрок реально видел нужную реакцию
 * (viewed_reactions содержит "characterId:required_reaction_evidence_id") —
 * без этого угадать правильную формулировку из 2-3 вариантов вслепую было бы
 * возможно. Раньше это было отдельным гейтом входа (403 до просмотра всех
 * реакций); теперь это часть самой проверки правильности ответа, потому что
 * экран "Обвинение" должен быть доступен в любой момент партии — угадавший
 * без улик просто получит { correct: false }, как обычная неверная попытка.
 * Ответ — только { correct }, а ending_text отдаётся ТОЛЬКО при полном успехе
 * (иначе спойлерит развязку раньше времени).
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
    .select("viewed_reactions")
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
    .select("accomplices, ending_text")
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

  const submittedAnswers = answers ?? [];
  const correct =
    accomplices.length > 0 &&
    accomplices.every((acc) => {
      const answer = submittedAnswers.find((a) => a.characterId === acc.character_id);
      if (!answer) return false;
      const optionCorrect = acc.options[answer.optionIndex]?.correct === true;
      const reactionSeen = viewedReactions.includes(
        `${acc.character_id}:${acc.required_reaction_evidence_id}`
      );
      return optionCorrect && reactionSeen;
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
