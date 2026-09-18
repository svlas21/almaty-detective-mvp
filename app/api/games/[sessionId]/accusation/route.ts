import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/**
 * GET /api/games/:sessionId/accusation
 *
 * Данные для экрана "Обвинение" (Дело №9704) — только то, что нужно для
 * рендера: варианты организатора как есть (в organizer_options нет метки
 * правильности) и вопросы про сообщников БЕЗ поля `correct` у вариантов, чтобы
 * ответ не палился в devtools/Network до победы. required_evidence_ids и
 * correct_organizer_character_id сюда не попадают вовсе — сверка на POST.
 *
 * Доступен в любой момент партии, без гейта по собранным уликам (кнопка
 * "Раскрыть дело" на ГУВД должна работать сразу) — честная игра
 * обеспечивается тем, что выбор улик на клиенте ограничен collectedEvidence,
 * а правильность ответа проверяется на POST по реальному инвентарю/
 * просмотренным реакциям, а не по факту вызова этого GET.
 */
export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
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

  const { data: purchase } = await db
    .from("purchases")
    .select("case_id")
    .eq("id", session.purchase_id)
    .single();

  const { data: accusation } = await db
    .from("case_accusation")
    .select("required_evidence_ids, organizer_options, accomplices")
    .eq("case_id", purchase?.case_id ?? "00000000-0000-0000-0000-000000000000")
    .maybeSingle();

  if (!accusation) {
    return NextResponse.json({ error: "Финал для этого дела не настроен" }, { status: 404 });
  }

  const accomplices: {
    character_id: string;
    question: string;
    options: { label: string; correct: boolean }[];
    required_reaction_evidence_id: string;
  }[] = accusation.accomplices ?? [];

  return NextResponse.json({
    organizerOptions: accusation.organizer_options ?? [],
    accomplices: accomplices.map((acc) => ({
      characterId: acc.character_id,
      question: acc.question,
      options: acc.options.map((o) => ({ label: o.label })),
    })),
  });
}
