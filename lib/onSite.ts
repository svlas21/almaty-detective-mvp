import { NextResponse } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * Свидетелей и подозреваемых допрашивают только на месте: следователь должен
 * находиться в той же локации, что и человек. Эксперты (is_expert) доступны
 * из любой локации — они в ГУВД «на телефоне».
 * Возвращает готовый ответ 403, если допрос сейчас невозможен, иначе null.
 */
export async function requireOnSite(
  db: SupabaseClient,
  sessionId: string,
  characterId: string
): Promise<NextResponse | null> {
  const [sessionRes, characterRes] = await Promise.all([
    db.from("game_sessions").select("current_location_id").eq("id", sessionId).single(),
    db.from("characters").select("location_id, is_expert").eq("id", characterId).single(),
  ]);
  const here = sessionRes.data?.current_location_id;
  const ch = characterRes.data;
  if (!ch || ch.is_expert || !ch.location_id) return null;
  if (ch.location_id !== here) {
    return NextResponse.json(
      { error: "Этот человек в другом месте. Допросить можно только на месте." },
      { status: 403 }
    );
  }
  return null;
}
