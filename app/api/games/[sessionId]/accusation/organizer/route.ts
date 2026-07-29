import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/**
 * POST /api/games/:sessionId/accusation/organizer
 * body: { organizerCharacterId: string; evidenceIds: string[] }
 *
 * Этап 1 экрана "Обвинение": игрок называет организатора и обосновывает
 * выбор минимум двумя уликами. Проверка ТОЛЬКО на сервере — верно, если
 * названный персонаж совпадает с correct_organizer_character_id И среди
 * отмеченных улик есть все required_evidence_ids. Ответ — только { correct },
 * без деталей, что именно не так (см. ТЗ: без спойлеров при неверной попытке).
 */
export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { organizerCharacterId, evidenceIds } = (await req.json()) as {
    organizerCharacterId?: string;
    evidenceIds?: string[];
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
    .select("required_evidence_ids, correct_organizer_character_id, accomplices")
    .eq("case_id", purchase?.case_id ?? "00000000-0000-0000-0000-000000000000")
    .maybeSingle();

  if (!accusation) {
    return NextResponse.json({ error: "Финал для этого дела не настроен" }, { status: 404 });
  }

  const viewedReactions: string[] = state.viewed_reactions ?? [];
  const accomplices: { character_id: string; required_reaction_evidence_id: string }[] =
    accusation.accomplices ?? [];
  const requiredEvidenceIds: string[] = accusation.required_evidence_ids ?? [];

  const unlocked =
    requiredEvidenceIds.every((id) => state.collected_evidence.includes(id)) &&
    accomplices.every((acc) =>
      viewedReactions.includes(`${acc.character_id}:${acc.required_reaction_evidence_id}`)
    );

  if (!unlocked) {
    return NextResponse.json({ error: "Обвинение пока недоступно" }, { status: 403 });
  }

  const submittedEvidenceIds = evidenceIds ?? [];
  const allSubmittedActuallyCollected = submittedEvidenceIds.every((id) =>
    state.collected_evidence.includes(id)
  );

  const correct =
    submittedEvidenceIds.length >= 2 &&
    allSubmittedActuallyCollected &&
    organizerCharacterId === accusation.correct_organizer_character_id &&
    requiredEvidenceIds.every((id) => submittedEvidenceIds.includes(id));

  return NextResponse.json({ correct });
}
