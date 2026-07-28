import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const db = supabaseAdmin();
  const { sessionId } = params;

  const { data: session, error: sessionError } = await db
    .from("game_sessions")
    .select("purchase_id, current_location_id")
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

  if (!purchase) {
    return NextResponse.json({ error: "Дело не найдено" }, { status: 404 });
  }

  const { data: pool, error: poolError } = await db
    .from("evidence")
    .select("id, name")
    .eq("case_id", purchase.case_id)
    .eq("location_id", session.current_location_id)
    .is("granted_by_character_id", null)
    .order("name");

  if (poolError) {
    return NextResponse.json({ error: "Не удалось загрузить список улик" }, { status: 500 });
  }

  return NextResponse.json({ pool: pool ?? [] });
}