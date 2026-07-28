import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/**
 * POST /api/games/:sessionId/suspects/:characterId/interrogated
 *
 * Отмечает, что игрок раскрыл ВСЕ вопросы протокола допроса этого персонажа
 * (InterrogationProtocol дошёл до allViewed === true на клиенте) — в отличие
 * от .../view (открытие карточки), это событие происходит позже и именно на
 * нём выдаются улики с granted_by_character_id (см. Техдок: улика может
 * попадать в инвентарь от персонажа, а не обыском локации).
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { sessionId: string; characterId: string } }
) {
  const db = supabaseAdmin();
  const { sessionId, characterId } = params;

  const { data: state, error: stateError } = await db
    .from("session_state")
    .select("discovered_evidence, collected_evidence")
    .eq("session_id", sessionId)
    .single();

  if (stateError || !state) {
    return NextResponse.json({ error: "Партия не найдена" }, { status: 404 });
  }

  const merge = (existing: string[], added: string[]) =>
    Array.from(new Set([...existing, ...added]));

  const { data: grantedEvidence } = await db
    .from("evidence")
    .select("id")
    .eq("granted_by_character_id", characterId);

  const grantedIds = (grantedEvidence ?? []).map((e) => e.id);

  const { error: updateError } = await db
    .from("session_state")
    .update({
      discovered_evidence: merge(state.discovered_evidence ?? [], grantedIds),
      collected_evidence: merge(state.collected_evidence ?? [], grantedIds),
    })
    .eq("session_id", sessionId);

  if (updateError) {
    return NextResponse.json({ error: "Не удалось выдать улики" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
