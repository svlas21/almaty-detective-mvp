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
 *
 * Без гейта по "готовности" — кнопка "Раскрыть дело" должна работать в любой
 * момент партии. Честная игра всё равно соблюдена: submittedEvidenceIds
 * сверяются с реальным collected_evidence, так что подставить улику, которой
 * нет в инвентаре, невозможно, а без всех required_evidence_ids ответ просто
 * не наберёт correct.
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
    .select("collected_evidence")
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
    .select("required_evidence_ids, correct_organizer_character_id")
    .eq("case_id", purchase?.case_id ?? "00000000-0000-0000-0000-000000000000")
    .maybeSingle();

  if (!accusation) {
    return NextResponse.json({ error: "Финал для этого дела не настроен" }, { status: 404 });
  }

  const requiredEvidenceIds: string[] = accusation.required_evidence_ids ?? [];

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
