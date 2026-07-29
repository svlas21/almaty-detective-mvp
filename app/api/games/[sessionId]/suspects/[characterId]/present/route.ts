import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string; characterId: string } }
) {
  const { evidenceId } = await req.json();
  const db = supabaseAdmin();
  const { sessionId, characterId } = params;

  const { data: state, error: stateError } = await db
    .from("session_state")
    .select(
      "discovered_characters, discovered_evidence, collected_evidence, discovered_locations, viewed_reactions, log"
    )
    .eq("session_id", sessionId)
    .single();

  if (stateError || !state) {
    return NextResponse.json({ error: "Партия не найдена" }, { status: 404 });
  }

  if (!state.discovered_characters.includes(characterId)) {
    return NextResponse.json({ error: "Этот подозреваемый ещё не обнаружен" }, { status: 403 });
  }

  if (!state.collected_evidence.includes(evidenceId)) {
    return NextResponse.json({ error: "Сначала найдите эту улику" }, { status: 400 });
  }

  const { data: character, error: characterError } = await db
    .from("characters")
    .select("case_id, name, reactions, confession_text, confession_requires_evidence, is_expert")
    .eq("id", characterId)
    .single();

  if (characterError || !character) {
    return NextResponse.json({ error: "Подозреваемый не найден" }, { status: 404 });
  }

  const { data: evidence } = await db
    .from("evidence")
    .select("name")
    .eq("id", evidenceId)
    .single();

  const reaction =
    character.reactions?.[evidenceId] ??
    (character.is_expert
      ? "По этому материалу заключения пока нет."
      : "«Не понимаю, к чему вы клоните» — пожимает плечами.");

  // "Reaction chain evidence" (Дело №9704): улика попадает в инвентарь не обыском
  // и не допросом, а после того как игрок увидел конкретную реакцию конкретного
  // персонажа на другую улику. Пока один такой переход:
  // Ежедневник → реакция Виктора ИЛИ Данияра → "Звонок Марата".
  let collectedEvidence = state.collected_evidence;
  let discoveredEvidence = state.discovered_evidence ?? [];

  if (
    evidence?.name === "Ежедневник на столе" &&
    (character.name === "Виктор Гринько" || character.name === "Данияр Ахметов")
  ) {
    const { data: zvonokMarata } = await db
      .from("evidence")
      .select("id")
      .eq("case_id", character.case_id)
      .eq("name", "Звонок Марата")
      .maybeSingle();

    if (zvonokMarata && !collectedEvidence.includes(zvonokMarata.id)) {
      collectedEvidence = [...collectedEvidence, zvonokMarata.id];
      discoveredEvidence = Array.from(new Set([...discoveredEvidence, zvonokMarata.id]));
    }
  }

  // Открытие локации "Съёмная квартира «Марата»" (Дело №9704): триггер — игрок
  // увидел реакцию эксперта Рината на "Звонок Марата" (экспертиза связывает
  // звонок с конкретным адресом).
  let discoveredLocations = state.discovered_locations;

  if (character.name === "Ринат Абишев" && evidence?.name === "Звонок Марата") {
    const { data: maratLocation } = await db
      .from("locations")
      .select("id")
      .eq("case_id", character.case_id)
      .eq("name", "Съёмная квартира «Марата»")
      .maybeSingle();

    if (maratLocation && !discoveredLocations.includes(maratLocation.id)) {
      discoveredLocations = [...discoveredLocations, maratLocation.id];
    }
  }

  // Факт "игрок предъявил улику X персонажу Y и увидел экран реакции" —
  // ключ для финального экрана "Обвинение" (case_accusation.accomplices[].
  // required_reaction_evidence_id), фиксируется на любую реакцию, включая
  // общую фразу-заглушку — экран реакции показывается в обоих случаях.
  const viewedReactionKey = `${characterId}:${evidenceId}`;
  const viewedReactions = Array.from(new Set([...(state.viewed_reactions ?? []), viewedReactionKey]));

  await db
    .from("session_state")
    .update({
      collected_evidence: collectedEvidence,
      discovered_evidence: discoveredEvidence,
      discovered_locations: discoveredLocations,
      viewed_reactions: viewedReactions,
      log: [
        ...(state.log ?? []),
        {
          type: "present",
          text: `Предъявили улику «${evidence?.name ?? ""}» персонажу ${character.name}`,
          at: new Date().toISOString(),
        },
      ],
    })
    .eq("session_id", sessionId);

  const response: { reaction: string; confession?: string } = { reaction };

  if (
    character.confession_requires_evidence &&
    character.confession_requires_evidence.length > 0 &&
    character.confession_requires_evidence.every((id: string) => collectedEvidence.includes(id))
  ) {
    response.confession = character.confession_text;
  }

  return NextResponse.json(response);
}
