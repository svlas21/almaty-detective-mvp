import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * POST /api/games/create
 * body: { purchaseId: string }
 *
 * Создаёт новую игровую партию для оплаченного билета (см. Техдок, разд. 4, шаг 2).
 * Стартовая локация и пустой session_state открываются автоматически.
 */
export async function POST(req: NextRequest) {
  const { purchaseId } = await req.json();

  if (!purchaseId) {
    return NextResponse.json({ error: "purchaseId обязателен" }, { status: 400 });
  }

  const db = supabaseAdmin();

  const { data: purchase, error: purchaseError } = await db
    .from("purchases")
    .select("id, status, case_id")
    .eq("id", purchaseId)
    .single();

  if (purchaseError || !purchase) {
    return NextResponse.json({ error: "Билет не найден" }, { status: 404 });
  }

  if (purchase.status !== "paid") {
    return NextResponse.json({ error: "Билет ещё не оплачен" }, { status: 402 });
  }

  const { data: caseRecord, error: caseError } = await db
    .from("cases")
    .select("id, start_location_id")
    .eq("id", purchase.case_id)
    .single();

  if (caseError || !caseRecord || !caseRecord.start_location_id) {
    return NextResponse.json({ error: "У дела не задана стартовая локация" }, { status: 500 });
  }

  const { data: session, error: sessionError } = await db
    .from("game_sessions")
    .insert({
      purchase_id: purchase.id,
      current_location_id: caseRecord.start_location_id,
      elapsed_minutes: 0,
      status: "in_progress",
    })
    .select()
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Не удалось создать партию" }, { status: 500 });
  }

  const { data: startLocationCharacters } = await db
    .from("characters")
    .select("id")
    .eq("location_id", caseRecord.start_location_id);

  const { error: stateError } = await db.from("session_state").insert({
    session_id: session.id,
    discovered_locations: [caseRecord.start_location_id],
    discovered_characters: (startLocationCharacters ?? []).map((c) => c.id),
    discovered_evidence: [],
    collected_evidence: [],
  });

  if (stateError) {
    return NextResponse.json({ error: "Не удалось инициализировать состояние партии" }, { status: 500 });
  }

  return NextResponse.json({ sessionId: session.id });
}
