import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TIME_COSTS } from "@/lib/scoring";

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { locationId } = await req.json();
  const db = supabaseAdmin();
  const { sessionId } = params;

  // Круг 1: всё, что нужно прочитать (параллельно). Раньше — 7 запросов подряд.
  const [stateRes, sessionRes, targetRes, charsRes] = await Promise.all([
    db.from("session_state").select("discovered_locations, discovered_characters, log").eq("session_id", sessionId).single(),
    db.from("game_sessions").select("elapsed_minutes").eq("id", sessionId).single(),
    db.from("locations").select("name").eq("id", locationId).single(),
    db.from("characters").select("id").eq("location_id", locationId),
  ]);
  const state = stateRes.data;

  if (!state || !sessionRes.data) {
    return NextResponse.json({ error: "Партия не найдена" }, { status: 404 });
  }

  if (!state.discovered_locations.includes(locationId)) {
    return NextResponse.json(
      { error: "Эта локация ещё не открыта в сюжете" },
      { status: 403 }
    );
  }

  const mergedCharacters = Array.from(
    new Set([...(state.discovered_characters ?? []), ...(charsRes.data ?? []).map((c) => c.id)])
  );

  // Круг 2: переход + время одной записью, состояние — параллельно
  const [updRes] = await Promise.all([
    db
      .from("game_sessions")
      .update({
        current_location_id: locationId,
        elapsed_minutes: sessionRes.data.elapsed_minutes + TIME_COSTS.TRAVEL_BETWEEN_LOCATIONS,
      })
      .eq("id", sessionId)
      .select()
      .single(),
    db
      .from("session_state")
      .update({
        discovered_characters: mergedCharacters,
        log: [
          ...(state.log ?? []),
          { type: "travel", text: `Прибыли: ${targetRes.data?.name ?? "локация"}`, at: new Date().toISOString() },
        ],
      })
      .eq("session_id", sessionId),
  ]);
  const updated = updRes.data;

  if (updRes.error || !updated) {
    return NextResponse.json({ error: "Не удалось перейти в локацию" }, { status: 500 });
  }

  return NextResponse.json({ session: updated });
}
