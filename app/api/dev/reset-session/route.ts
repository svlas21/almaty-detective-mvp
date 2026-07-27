import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/**
 * POST /api/dev/reset-session
 * body: { sessionId: string }
 *
 * Только для тестирования: сбрасывает игровую партию к начальному состоянию
 * (та же стартовая локация/персонажи, что и при создании — см. games/create/route.ts),
 * не трогая purchases/profiles. Недоступен вне dev-окружения.
 */
export async function POST(req: NextRequest) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Недоступно в проде" }, { status: 403 });
  }

  const { sessionId } = await req.json();

  if (!sessionId) {
    return NextResponse.json({ error: "sessionId обязателен" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: session, error: sessionError } = await db
    .from("game_sessions")
    .select("id, purchase_id")
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

  const { data: caseRecord, error: caseError } = await db
    .from("cases")
    .select("start_location_id")
    .eq("id", purchase?.case_id)
    .single();

  if (caseError || !caseRecord || !caseRecord.start_location_id) {
    return NextResponse.json({ error: "У дела не задана стартовая локация" }, { status: 500 });
  }

  const { data: startLocationCharacters } = await db
    .from("characters")
    .select("id")
    .eq("location_id", caseRecord.start_location_id);

  const { error: updateSessionError } = await db
    .from("game_sessions")
    .update({
      current_location_id: caseRecord.start_location_id,
      elapsed_minutes: 0,
      status: "in_progress",
      score: null,
      finished_at: null,
      intro_seen: false,
    })
    .eq("id", sessionId);

  if (updateSessionError) {
    return NextResponse.json({ error: "Не удалось сбросить партию" }, { status: 500 });
  }

  const { error: updateStateError } = await db
    .from("session_state")
    .update({
      discovered_locations: [caseRecord.start_location_id],
      discovered_characters: (startLocationCharacters ?? []).map((c) => c.id),
      discovered_evidence: [],
      collected_evidence: [],
      viewed_characters: [],
      log: [],
    })
    .eq("session_id", sessionId);

  if (updateStateError) {
    return NextResponse.json({ error: "Не удалось сбросить состояние партии" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
