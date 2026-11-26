import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { computeResult } from "@/lib/caseResult";

export const dynamic = "force-dynamic";

/**
 * GET /api/games/:sessionId/result
 * Итог раскрытого дела (счёт, звание, цифры для карточки). Только после финала.
 */
export async function GET(_req: NextRequest, { params }: { params: { sessionId: string } }) {
  const db = supabaseAdmin();
  const { sessionId } = params;

  const { data: session } = await db
    .from("game_sessions")
    .select("purchase_id, status, elapsed_minutes")
    .eq("id", sessionId)
    .single();
  if (!session) return NextResponse.json({ error: "Партия не найдена" }, { status: 404 });
  if (session.status !== "finished") return NextResponse.json({ error: "Дело ещё не раскрыто" }, { status: 409 });

  const [{ data: purchase }, { data: state }] = await Promise.all([
    db.from("purchases").select("case_id").eq("id", session.purchase_id).single(),
    db.from("session_state").select("log, collected_evidence").eq("session_id", sessionId).single(),
  ]);
  const caseId = purchase?.case_id ?? "00000000-0000-0000-0000-000000000000";

  const [{ data: caseRow }, { data: relevant }] = await Promise.all([
    db.from("cases").select("title").eq("id", caseId).maybeSingle(),
    db.from("evidence").select("id").eq("case_id", caseId).neq("is_relevant", false),
  ]);
  const relevantIds = new Set((relevant ?? []).map((e) => e.id as string));
  const collected: string[] = state?.collected_evidence ?? [];

  const result = computeResult({
    log: state?.log ?? [],
    gameMinutes: session.elapsed_minutes ?? 0,
    evidenceFound: collected.filter((id) => relevantIds.has(id)).length,
    evidenceTotal: relevantIds.size,
  });

  return NextResponse.json({ ...result, caseTitle: caseRow?.title ?? null });
}
