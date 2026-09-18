import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

/**
 * POST /api/games/:sessionId/calls/:callId/answer
 *
 * Игрок нажал "Ответить" на входящий звонок (см. state/route.ts:pendingCall,
 * PhoneCallOverlay). Помечает звонок услышанным (viewed_calls) и применяет
 * его последствия — открытие локации / выдачу улики, если заданы.
 */
export async function POST(
  _req: NextRequest,
  { params }: { params: { sessionId: string; callId: string } }
) {
  const db = supabaseAdmin();
  const { sessionId, callId } = params;

  const { data: state, error: stateError } = await db
    .from("session_state")
    .select("viewed_calls, discovered_locations, discovered_evidence, collected_evidence, log")
    .eq("session_id", sessionId)
    .single();

  if (stateError || !state) {
    return NextResponse.json({ error: "Партия не найдена" }, { status: 404 });
  }

  const { data: call, error: callError } = await db
    .from("phone_calls")
    .select("dialogue_text, unlocks_location_id, grants_evidence_id, characters(name)")
    .eq("id", callId)
    .single();

  if (callError || !call) {
    return NextResponse.json({ error: "Звонок не найден" }, { status: 404 });
  }

  const viewedCalls = Array.from(new Set([...(state.viewed_calls ?? []), callId]));

  const discoveredLocations =
    call.unlocks_location_id && !state.discovered_locations.includes(call.unlocks_location_id)
      ? [...state.discovered_locations, call.unlocks_location_id]
      : state.discovered_locations;

  const discoveredEvidence =
    call.grants_evidence_id && !(state.discovered_evidence ?? []).includes(call.grants_evidence_id)
      ? [...(state.discovered_evidence ?? []), call.grants_evidence_id]
      : state.discovered_evidence ?? [];

  const collectedEvidence =
    call.grants_evidence_id && !state.collected_evidence.includes(call.grants_evidence_id)
      ? [...state.collected_evidence, call.grants_evidence_id]
      : state.collected_evidence;

  const callerName = (call.characters as { name: string } | null)?.name ?? "Неизвестный";

  // Журнал расследования (Дело №9704): если звонок выдаёт улику, это тоже
  // отдельная "evidence"-запись — по тому же принципу, что и в present/ask/
  // question-viewed.
  const grantedEvidenceLogEntries: { type: "evidence"; outcome: "found"; evidenceName: string; source: string; at: string }[] = [];

  if (call.grants_evidence_id) {
    const { data: grantedEvidence } = await db
      .from("evidence")
      .select("name")
      .eq("id", call.grants_evidence_id)
      .maybeSingle();

    if (grantedEvidence) {
      grantedEvidenceLogEntries.push({
        type: "evidence",
        outcome: "found",
        evidenceName: grantedEvidence.name,
        source: callerName,
        at: new Date().toISOString(),
      });
    }
  }

  const { error: updateError } = await db
    .from("session_state")
    .update({
      viewed_calls: viewedCalls,
      discovered_locations: discoveredLocations,
      discovered_evidence: discoveredEvidence,
      collected_evidence: collectedEvidence,
      log: [
        ...(state.log ?? []),
        {
          type: "call",
          callerName,
          dialogueText: call.dialogue_text,
          at: new Date().toISOString(),
        },
        ...grantedEvidenceLogEntries,
      ],
    })
    .eq("session_id", sessionId);

  if (updateError) {
    return NextResponse.json({ error: "Не удалось обработать звонок" }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
