import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TIME_COSTS } from "@/lib/scoring";

/**
 * POST /api/games/:sessionId/dialogue
 * body: { topicId: string }
 *
 * Игрок кликает тему допроса (иконку улики/персонажа) — сервер возвращает
 * заготовленный ответ, открывает новые локации/персонажей/улики (reveals)
 * и прибавляет 5 минут игрового времени (см. Техдок, разд. 4 шаг 4, разд. 5).
 *
 * Нет NLP/чат-бота — вся логика это lookup по dialogue_topics/dialogue_responses.
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { topicId } = await req.json();
  const db = supabaseAdmin();
  const { sessionId } = params;

  const { data: topic, error: topicError } = await db
    .from("dialogue_topics")
    .select("*")
    .eq("id", topicId)
    .single();

  if (topicError || !topic) {
    return NextResponse.json({ error: "Тема допроса не найдена" }, { status: 404 });
  }

  const { data: response, error: responseError } = await db
    .from("dialogue_responses")
    .select("*")
    .eq("topic_id", topicId)
    .single();

  if (responseError || !response) {
    return NextResponse.json({ error: "Ответ для этой темы не настроен" }, { status: 404 });
  }

  const { data: state, error: stateError } = await db
    .from("session_state")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  if (stateError || !state) {
    return NextResponse.json({ error: "Партия не найдена" }, { status: 404 });
  }

  // Объединяем уже открытое с тем, что открывает этот ответ (reveals), без дублей
  const merge = (existing: string[], added: string[]) =>
    Array.from(new Set([...existing, ...added]));

  const reveals = response.reveals as {
    locations: string[];
    characters: string[];
    evidence: string[];
  };

  const newDiscoveredLocations = merge(state.discovered_locations, reveals.locations);
  const newDiscoveredCharacters = merge(state.discovered_characters, reveals.characters);
  const newDiscoveredEvidence = merge(state.discovered_evidence, reveals.evidence);

  // Если тема была про конкретную улику — считаем её "собранной" (пригодится для финала-обвинения)
  const newCollectedEvidence =
    topic.topic_type === "evidence"
      ? merge(state.collected_evidence, [topic.topic_ref_id])
      : state.collected_evidence;

  const { error: updateStateError } = await db
    .from("session_state")
    .update({
      discovered_locations: newDiscoveredLocations,
      discovered_characters: newDiscoveredCharacters,
      discovered_evidence: newDiscoveredEvidence,
      collected_evidence: newCollectedEvidence,
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId);

  if (updateStateError) {
    return NextResponse.json({ error: "Не удалось обновить состояние партии" }, { status: 500 });
  }

  const { data: session } = await db
    .from("game_sessions")
    .select("elapsed_minutes")
    .eq("id", sessionId)
    .single();

  const { data: updatedSession } = await db
    .from("game_sessions")
    .update({
      elapsed_minutes: (session?.elapsed_minutes ?? 0) + TIME_COSTS.INTERROGATE_OR_INSPECT,
    })
    .eq("id", sessionId)
    .select()
    .single();

  return NextResponse.json({
    responseText: response.response_text,
    session: updatedSession,
  });
}
