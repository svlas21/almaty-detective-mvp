import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const db = supabaseAdmin();
  const { sessionId } = params;
  const { characterId } = await req.json().catch(() => ({ characterId: undefined }));

  // Брифинг проходит в ГУВД — после интро игрок должен оказаться внутри этой
  // локации (экран хаба), а не на карте. current_location_id уже указывает на
  // стартовую локацию с момента создания партии, но выставляем явно и здесь —
  // на случай, если сессию до интро успели перевести куда-то ещё (dev-сброс и т.п.).
  const { data: session } = await db
    .from("game_sessions")
    .select("purchase_id")
    .eq("id", sessionId)
    .single();
  const { data: purchase } = session
    ? await db.from("purchases").select("case_id").eq("id", session.purchase_id).single()
    : { data: null };
  const { data: caseRecord } = purchase
    ? await db.from("cases").select("start_location_id").eq("id", purchase.case_id).single()
    : { data: null };

  const { error } = await db
    .from("game_sessions")
    .update({
      intro_seen: true,
      ...(caseRecord?.start_location_id ? { current_location_id: caseRecord.start_location_id } : {}),
    })
    .eq("id", sessionId);

  if (error) {
    return NextResponse.json({ error: "Не удалось завершить вступление" }, { status: 500 });
  }

  // Брифинг у Азамата — это допрос по факту, просто без отдельного клика по
  // карточке: засчитываем его в viewed_characters тем же способом, что
  // suspects/[characterId]/view, иначе его mentions не всплывут на доске.
  if (characterId) {
    const { data: state } = await db
      .from("session_state")
      .select("viewed_characters")
      .eq("session_id", sessionId)
      .single();

    if (state) {
      const merged = Array.from(new Set([...(state.viewed_characters ?? []), characterId]));
      await db.from("session_state").update({ viewed_characters: merged }).eq("session_id", sessionId);
    }
  }

  return NextResponse.json({ ok: true });
}
