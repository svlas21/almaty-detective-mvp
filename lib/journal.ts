import type { supabaseAdmin } from "@/lib/supabaseAdmin";

/**
 * Ежедневник следователя (session_state.log).
 * Каждая запись получает gm — игровое время в минутах от начала дела
 * (game_sessions.elapsed_minutes на момент действия). По нему ежедневник
 * показывает день и час, а не время на часах игрока.
 */
type Db = ReturnType<typeof supabaseAdmin>;

export async function gameMinutes(db: Db, sessionId: string): Promise<number | null> {
  const { data } = await db.from("game_sessions").select("elapsed_minutes").eq("id", sessionId).single();
  return typeof data?.elapsed_minutes === "number" ? data.elapsed_minutes : null;
}

/** Ставит игровое время новым записям (если у записи своего gm нет). */
export function stamp<T extends Record<string, unknown>>(entries: T[], gm: number | null): T[] {
  if (gm === null) return entries;
  return entries.map((e) => ("gm" in e ? e : { ...e, gm }));
}
