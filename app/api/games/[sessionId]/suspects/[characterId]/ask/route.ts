import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

interface TopicAnswerEntry {
  competence: "in" | "out";
  text: string;
  pre_condition_text?: string;
  condition_evidence_id?: string;
  grants_evidence_id?: string;
}

/**
 * POST /api/games/:sessionId/suspects/:characterId/ask
 * body: { topicId: string }
 *
 * Секция "Спросить про..." на экране допроса — раскрывает тему по имени/
 * событию, не привязанную к конкретной улике (в отличие от "Предъявить
 * улику"/present). Три ступени разрешения ответа (см. supabase/007_topics.sql):
 *  1. Авторская запись в characters.topic_answers[topicId], если есть.
 *  2. Внутри неё — pre/post-переключение по condition_evidence_id.
 *  3. Иначе — шаблонный фоллбэк по типу персонажа (эксперт/фигурант/никто).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string; characterId: string } }
) {
  const { topicId } = await req.json();
  const db = supabaseAdmin();
  const { sessionId, characterId } = params;

  if (!topicId) {
    return NextResponse.json({ error: "topicId обязателен" }, { status: 400 });
  }

  const { data: state, error: stateError } = await db
    .from("session_state")
    .select(
      "discovered_characters, collected_evidence, discovered_evidence, viewed_characters, discovered_locations, viewed_reactions, log"
    )
    .eq("session_id", sessionId)
    .single();

  if (stateError || !state) {
    return NextResponse.json({ error: "Партия не найдена" }, { status: 404 });
  }

  if (!state.discovered_characters.includes(characterId)) {
    return NextResponse.json({ error: "Этот персонаж ещё не обнаружен" }, { status: 403 });
  }

  const { data: character, error: characterError } = await db
    .from("characters")
    .select("name, is_expert, is_case_subject, topic_answers")
    .eq("id", characterId)
    .single();

  if (characterError || !character) {
    return NextResponse.json({ error: "Персонаж не найден" }, { status: 404 });
  }

  const { data: topic, error: topicError } = await db
    .from("topics")
    .select(
      "label, unlock_evidence_id, unlock_character_id, unlock_location_id, unlock_reaction_character_id, unlock_reaction_evidence_id, expert_redirect_name"
    )
    .eq("id", topicId)
    .single();

  if (topicError || !topic) {
    return NextResponse.json({ error: "Тема не найдена" }, { status: 404 });
  }

  // Условия открытия темы (см. supabase/008_topic_unlock_conditions.sql) —
  // у темы задано 0 или 1 условие любого вида, но проверяем все поля
  // единообразно (AND по тем, что заданы).
  const viewedCharacters = state.viewed_characters ?? [];
  const discoveredLocations = state.discovered_locations ?? [];
  const viewedReactions = state.viewed_reactions ?? [];

  const topicLocked =
    (topic.unlock_evidence_id && !state.collected_evidence.includes(topic.unlock_evidence_id)) ||
    (topic.unlock_character_id && !viewedCharacters.includes(topic.unlock_character_id)) ||
    (topic.unlock_location_id && !discoveredLocations.includes(topic.unlock_location_id)) ||
    (topic.unlock_reaction_character_id &&
      topic.unlock_reaction_evidence_id &&
      !viewedReactions.includes(`${topic.unlock_reaction_character_id}:${topic.unlock_reaction_evidence_id}`));

  if (topicLocked) {
    return NextResponse.json({ error: "Эта тема ещё не открыта" }, { status: 403 });
  }

  const entry: TopicAnswerEntry | undefined = (character.topic_answers ?? {})[topicId];

  let text: string;
  let grantsEvidenceId: string | undefined;

  if (entry) {
    const conditionMet =
      !entry.condition_evidence_id || state.collected_evidence.includes(entry.condition_evidence_id);
    text = conditionMet ? entry.text : entry.pre_condition_text ?? entry.text;
    if (conditionMet) grantsEvidenceId = entry.grants_evidence_id;
  } else if (character.is_expert) {
    text = topic.expert_redirect_name
      ? `Это не по моей части — обратитесь к ${topic.expert_redirect_name}.`
      : "Это не по моей части.";
  } else if (character.is_case_subject) {
    text = "Что-то такое слышал(а)/видел(а), но добавить особо нечего.";
  } else {
    text = "Не знаю, это не по моей части.";
  }

  let collectedEvidence = state.collected_evidence;
  let discoveredEvidence = state.discovered_evidence ?? [];

  if (grantsEvidenceId && !collectedEvidence.includes(grantsEvidenceId)) {
    collectedEvidence = [...collectedEvidence, grantsEvidenceId];
    discoveredEvidence = Array.from(new Set([...discoveredEvidence, grantsEvidenceId]));
  }

  await db
    .from("session_state")
    .update({
      collected_evidence: collectedEvidence,
      discovered_evidence: discoveredEvidence,
      log: [
        ...(state.log ?? []),
        {
          type: "ask",
          text: `Спросили ${character.name} про «${topic.label}»`,
          at: new Date().toISOString(),
        },
      ],
    })
    .eq("session_id", sessionId);

  return NextResponse.json({ text });
}
