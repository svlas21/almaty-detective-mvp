import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { TIME_COSTS } from "@/lib/scoring";
import { requiresAnySatisfied } from "@/lib/graphRules";

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const { evidenceId } = await req.json();
  const db = supabaseAdmin();
  const { sessionId } = params;

  // Все чтения — параллельно. Раньше было 5 последовательных запросов к
  // Supabase (каждый — полный сетевой круг), и клик по улике ждал 1–2 с.
  // Теперь: один круг на чтение + один круг на две параллельные записи.
  const [sessionRes, evidenceRes, stateRes] = await Promise.all([
    db.from("game_sessions").select("*").eq("id", sessionId).single(),
    db.from("evidence").select("*").eq("id", evidenceId).maybeSingle(),
    db
      .from("session_state")
      .select("discovered_evidence, collected_evidence, log")
      .eq("session_id", sessionId)
      .single(),
  ]);

  const session = sessionRes.data;
  if (sessionRes.error || !session) {
    return NextResponse.json({ error: "Партия не найдена" }, { status: 404 });
  }
  if (evidenceRes.error) {
    return NextResponse.json({ error: "Не удалось проверить улику" }, { status: 500 });
  }
  const evidence = evidenceRes.data;
  const stateForLog = stateRes.data;

  const updatedSession = {
    ...session,
    elapsed_minutes: session.elapsed_minutes + TIME_COSTS.INTERROGATE_OR_INSPECT,
  };

  // Время партии и session_state пишутся одновременно.
  const finish = async (stateUpdate: Record<string, unknown>) => {
    await Promise.all([
      db
        .from("game_sessions")
        .update({ elapsed_minutes: updatedSession.elapsed_minutes })
        .eq("id", sessionId),
      db.from("session_state").update(stateUpdate).eq("session_id", sessionId),
    ]);
  };

  // Журнал расследования (Дело №9704): явный outcome вместо готового текста —
  // "found" (реальная находка) отличается от "miss" (декой/неверная догадка).
  const appendLog = (entry: { outcome: "found" | "miss"; evidenceName?: string }) => [
    ...(stateForLog?.log ?? []),
    { type: "evidence" as const, at: new Date().toISOString(), ...entry },
  ];

  // evidenceId может быть обманкой из case_decoy_categories — категорией
  // облака осмотра без реальной улики за ней. Ведём себя как при обычном
  // неверном варианте, без намёка, что это была заведомая пустышка.
  if (!evidence) {
    await finish({ log: appendLog({ outcome: "miss" }) });
    return NextResponse.json({
      relevant: false,
      message: "Здесь такого не нашли.",
      session: updatedSession,
    });
  }

  const isCorrectGuess =
    evidence.is_relevant &&
    evidence.location_id === session.current_location_id &&
    !evidence.auto_grant &&
    requiresAnySatisfied(evidence.requires_any, stateForLog?.collected_evidence ?? []);

  if (!isCorrectGuess) {
    await finish({ log: appendLog({ outcome: "miss", evidenceName: evidence.name }) });
    return NextResponse.json({
      relevant: false,
      message: evidence.reject_text ?? "Здесь такого не нашли.",
      session: updatedSession,
    });
  }

  const merge = (arr: string[], id: string) => (arr.includes(id) ? arr : [...arr, id]);

  await finish({
    discovered_evidence: merge(stateForLog?.discovered_evidence ?? [], evidenceId),
    collected_evidence: merge(stateForLog?.collected_evidence ?? [], evidenceId),
    log: appendLog({ outcome: "found", evidenceName: evidence.name }),
    updated_at: new Date().toISOString(),
  });

  return NextResponse.json({
    relevant: true,
    description: evidence.description,
    session: updatedSession,
  });
}
