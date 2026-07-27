import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TIME_COSTS } from "@/lib/scoring";

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { evidenceId } = await req.json();
  const db = supabaseAdmin();
  const { sessionId } = params;

  const { data: session, error: sessionError } = await db
    .from("game_sessions")
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Партия не найдена" }, { status: 404 });
  }

  const { data: evidence, error: evidenceError } = await db
    .from("evidence")
    .select("*")
    .eq("id", evidenceId)
    .single();

  if (evidenceError || !evidence) {
    return NextResponse.json({ error: "Предмет не найден" }, { status: 404 });
  }

  const { data: updatedSession } = await db
    .from("game_sessions")
    .update({ elapsed_minutes: session.elapsed_minutes + TIME_COSTS.INTERROGATE_OR_INSPECT })
    .eq("id", sessionId)
    .select()
    .single();

  const isCorrectGuess = evidence.is_relevant && evidence.location_id === session.current_location_id;

  const { data: stateForLog } = await db
    .from("session_state")
    .select("discovered_evidence, collected_evidence, log")
    .eq("session_id", sessionId)
    .single();

  const appendLog = (text: string) => [
    ...(stateForLog?.log ?? []),
    { type: "evidence", text, at: new Date().toISOString() },
  ];

  if (!isCorrectGuess) {
    await db
      .from("session_state")
      .update({ log: appendLog(`Проверили «${evidence.name}» — не относится к делу`) })
      .eq("session_id", sessionId);

    return NextResponse.json({
      relevant: false,
      message: evidence.reject_text ?? "Здесь такого не нашли.",
      session: updatedSession,
    });
  }

  const merge = (arr: string[], id: string) =>
    arr.includes(id) ? arr : [...arr, id];

  await db
    .from("session_state")
    .update({
      discovered_evidence: merge(stateForLog?.discovered_evidence ?? [], evidenceId),
      collected_evidence: merge(stateForLog?.collected_evidence ?? [], evidenceId),
      log: appendLog(`Нашли улику: «${evidence.name}»`),
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId);

  return NextResponse.json({
    relevant: true,
    description: evidence.description,
    session: updatedSession,
  });
}