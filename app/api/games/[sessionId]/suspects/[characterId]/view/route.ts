import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/**
 * POST /api/games/:sessionId/suspects/:characterId/view
 *
 * Отмечает, что игрок открыл карточку допроса этого персонажа — в отличие
 * от discovered_characters (который фиксирует только "встречен по локации",
 * см. travel/route.ts), viewed_characters фиксирует именно просмотр карточки.
 * На этом сигнале строятся условные открытия (например Валентина Сартакова
 * в хабе — см. state/route.ts).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { sessionId: string; characterId: string } }
) {
  const db = supabaseAdmin();
  const { sessionId, characterId } = params;

  const { data: state, error: stateError } = await db
    .from("session_state")
    .select("viewed_characters")
    .eq("session_id", sessionId)
    .single();

  if (stateError || !state) {
    return NextResponse.json({ error: "Партия не найдена" }, { status: 404 });
  }

  const merged = Array.from(new Set([...(state.viewed_characters ?? []), characterId]));

  const { error: updateError } = await db
    .from("session_state")
    .update({ viewed_characters: merged })
    .eq("session_id", sessionId);

  if (updateError) {
    return NextResponse.json({ error: "Не удалось отметить просмотр" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
