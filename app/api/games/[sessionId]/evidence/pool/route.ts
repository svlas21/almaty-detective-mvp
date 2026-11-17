import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { requiresAnySatisfied } from "@/lib/graphRules";

export const dynamic = "force-dynamic";

function shuffle<T>(items: T[]): T[] {
  const result = [...items];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

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
    .select("id, name, generic_category, requires_any, auto_grant")
    .eq("case_id", purchase.case_id)
    .eq("location_id", session.current_location_id)
    .is("granted_by_character_id", null)
    .order("name");

  // Улики с условием (supabase/011_graph_rules.sql) не показываются в обыске,
  // пока условие не выполнено; auto_grant-улики в обыск не попадают вовсе.
  const { data: poolState } = await db
    .from("session_state")
    .select("collected_evidence")
    .eq("session_id", sessionId)
    .single();
  const collectedForPool: string[] = poolState?.collected_evidence ?? [];
  const availablePool = (pool ?? []).filter(
    (item) => !item.auto_grant && requiresAnySatisfied(item.requires_any, collectedForPool)
  );

  if (poolError) {
    return NextResponse.json({ error: "Не удалось загрузить список улик" }, { status: 500 });
  }

  // Облако осмотра не должно спойлерить реальное название улики — показываем
  // generic_category (маскирующую категорию вроде "Книги и блокноты").
  // Фолбэк на name — только для случая, если у какой-то локационной улики
  // категория не заполнена (не должно случаться в норме).
  const realItems = availablePool.map((item) => ({
    id: item.id,
    name: item.generic_category ?? item.name,
  }));

  // Реальных категорий этой локации мало — 5 вариантов = угадывание почти
  // без риска. Добираем список честными обманками из case_decoy_categories
  // (Дело №9704), которых у этой улики за душой нет: выбор мимо них должен
  // выглядеть как обычный неверный вариант, не как "заведомая пустышка"
  // (см. .../evidence/check). Показываем ВСЕ доступные обманки (их ~30 на
  // дело) — крупное облако само по себе усложняет угадывание.
  const realLabels = new Set(realItems.map((item) => item.name));
  // Обманки двух видов: общие на всё дело (location_id = null, «здесь такого
  // нет») и привязанные к локации — предметы, которые реально видны на
  // панораме, но к делу не относятся (у них есть found_text).
  const { data: decoyCategories } = await db
    .from("case_decoy_categories")
    .select("id, label, location_id")
    .eq("case_id", purchase.case_id)
    .or(`location_id.is.null,location_id.eq.${session.current_location_id}`);

  const localLabels = new Set(
    (decoyCategories ?? []).filter((d) => d.location_id).map((d) => d.label)
  );
  const decoyItems = (decoyCategories ?? [])
    .filter((decoy) => !realLabels.has(decoy.label))
    .filter((decoy) => decoy.location_id || !localLabels.has(decoy.label))
    .map((decoy) => ({ id: decoy.id, name: decoy.label }));

  return NextResponse.json({ pool: shuffle([...realItems, ...decoyItems]) });
}