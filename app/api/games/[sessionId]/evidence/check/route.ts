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
    .maybeSingle();

  if (evidenceError) {
    return NextResponse.json({ error: "Не удалось проверить улику" }, { status: 500 });
  }

  const { data: updatedSession } = await db
    .from("game_sessions")
    .update({ elapsed_minutes: session.elapsed_minutes + TIME_COSTS.INTERROGATE_OR_INSPECT })
    .eq("id", sessionId)
    .select()
    .single();

  const { data: stateForLog } = await db
    .from("session_state")
    .select("discovered_evidence, collected_evidence, log")
    .eq("session_id", sessionId)
    .single();

  // Журнал расследования (Дело №9704): явный outcome вместо готового текста —
  // "found" (реальная находка) отличается от "miss" (декой/неверная догадка),
  // раньше оба варианта писались под одним type:"evidence" и различались
  // только текстом, что не позволяло надёжно отфильтровать промахи в журнале.
  const appendLog = (entry: { outcome: "found" | "miss"; evidenceName?: string }) => [
    ...(stateForLog?.log ?? []),
    { type: "evidence" as const, at: new Date().toISOString(), ...entry },
  ];

  // evidenceId может быть обманкой из case_decoy_categories — категорией
  // облака осмотра без реальной улики за ней. Ведём себя как при обычном
  // неверном варианте, без намёка, что это была заведомая пустышка.
  if (!evidence) {
    await db
      .from("session_state")
      .update({ log: appendLog({ outcome: "miss" }) })
      .eq("session_id", sessionId);

    return NextResponse.json({
      relevant: false,
      message: "Здесь такого не нашли.",
      session: updatedSession,
    });
  }

  const isCorrectGuess = evidence.is_relevant && evidence.location_id === session.current_location_id;

  if (!isCorrectGuess) {
    await db
      .from("session_state")
      .update({ log: appendLog({ outcome: "miss", evidenceName: evidence.name }) })
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
      log: appendLog({ outcome: "found", evidenceName: evidence.name }),
      updated_at: new Date().toISOString(),
    })
    .eq("session_id", sessionId);

  return NextResponse.json({
    relevant: true,
    description: evidence.description,
    session: updatedSession,
  });
}