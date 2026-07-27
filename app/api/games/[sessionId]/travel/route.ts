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

  const { data: state } = await db
    .from("session_state")
    .select("discovered_locations")
    .eq("session_id", sessionId)
    .single();

  if (!state) {
    return NextResponse.json({ error: "Партия не найдена" }, { status: 404 });
  }

  if (!state.discovered_locations.includes(locationId)) {
    return NextResponse.json(
      { error: "Эта локация ещё не открыта в сюжете" },
      { status: 403 }
    );
  }

  const { data: session, error } = await db
    .from("game_sessions")
    .update({ current_location_id: locationId })
    .eq("id", sessionId)
    .select()
    .single();

  if (error || !session) {
    return NextResponse.json({ error: "Не удалось перейти в локацию" }, { status: 500 });
  }

  const { data: updated, error: timeError } = await db
    .from("game_sessions")
    .update({ elapsed_minutes: session.elapsed_minutes + TIME_COSTS.TRAVEL_BETWEEN_LOCATIONS })
    .eq("id", sessionId)
    .select()
    .single();

  if (timeError || !updated) {
    return NextResponse.json({ error: "Не удалось обновить игровое время" }, { status: 500 });
  }

  const { data: targetLocation } = await db
    .from("locations")
    .select("name")
    .eq("id", locationId)
    .single();

  const { data: locationCharacters } = await db
    .from("characters")
    .select("id")
    .eq("location_id", locationId);

  const { data: currentState } = await db
    .from("session_state")
    .select("log, discovered_characters")
    .eq("session_id", sessionId)
    .single();

  const mergedCharacters = Array.from(
    new Set([
      ...(currentState?.discovered_characters ?? []),
      ...(locationCharacters ?? []).map((c) => c.id),
    ])
  );

  await db
    .from("session_state")
    .update({
      discovered_characters: mergedCharacters,
      log: [
        ...(currentState?.log ?? []),
        { type: "travel", text: `Прибыли: ${targetLocation?.name ?? "локация"}`, at: new Date().toISOString() },
      ],
    })
    .eq("session_id", sessionId);

  return NextResponse.json({ session: updated });
}