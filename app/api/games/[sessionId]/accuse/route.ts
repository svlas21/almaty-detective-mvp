import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { calculateScore } from "@/lib/scoring";

/**
 * POST /api/games/:sessionId/accuse
 * body: { answers: { questionId: string; evidenceIds: string[] }[] }
 *
 * "Раскрыть дело" (см. Техдок, разд. 4, шаги 7-8). Игрок отвечает на каждый
 * accusation_question, прикладывая id улик из своего collected_evidence.
 * Правильность проверяется на сервере пересечением множеств —
 * НИКАКОЙ логики или формулы очков на клиенте.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { answers } = await req.json() as {
    answers: { questionId: string; evidenceIds: string[] }[];
  };
  const db = supabaseAdmin();
  const { sessionId } = params;

  const { data: session, error: sessionError } = await db
    .from("game_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Партия не найдена" }, { status: 404 });
  }

  const { data: state } = await db
    .from("session_state")
    .select("collected_evidence")
    .eq("session_id", sessionId)
    .single();

  const { data: purchase } = await db
    .from("purchases")
    .select("case_id")
    .eq("id", session.purchase_id)
    .single();

  const { data: questions, error: questionsError } = await db
    .from("accusation_questions")
    .select("*")
    .eq("case_id", purchase?.case_id)
    .order("order_index");

  if (questionsError || !questions) {
    return NextResponse.json({ error: "Вопросы для финала не настроены" }, { status: 500 });
  }

  const collected = new Set(state?.collected_evidence ?? []);

  let correctAnswers = 0;
  const results = questions.map((q) => {
    const given = answers.find((a) => a.questionId === q.id)?.evidenceIds ?? [];
    const required: string[] = q.required_evidence_ids;

    // Правильно, если игрок предъявил ровно нужный набор улик и все они реально собраны
    const isCorrect =
      required.every((id) => given.includes(id) && collected.has(id)) &&
      given.length === required.length;

    if (isCorrect) correctAnswers += 1;

    return { questionId: q.id, isCorrect };
  });

  const score = calculateScore({
    correctAnswers,
    totalQuestions: questions.length,
    elapsedMinutes: session.elapsed_minutes,
  });

  const { data: updatedSession, error: finishError } = await db
    .from("game_sessions")
    .update({
      status: "finished",
      score,
      finished_at: new Date().toISOString(),
    })
    .eq("id", sessionId)
    .select()
    .single();

  if (finishError || !updatedSession) {
    return NextResponse.json({ error: "Не удалось завершить партию" }, { status: 500 });
  }

  return NextResponse.json({
    results,
    correctAnswers,
    totalQuestions: questions.length,
    elapsedMinutes: session.elapsed_minutes,
    score,
  });
}
