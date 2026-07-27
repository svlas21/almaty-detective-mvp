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
    .select("discovered_characters, collected_evidence, log")
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
    .select("name, reactions, confession_text, confession_requires_evidence, is_expert")
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

  await db
    .from("session_state")
    .update({
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
    character.confession_requires_evidence.every((id: string) => state.collected_evidence.includes(id))
  ) {
    response.confession = character.confession_text;
  }

  return NextResponse.json(response);
}
