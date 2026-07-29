import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";

export const dynamic = "force-dynamic";

// Ориентир по ширине облака (Дело №9704): все реальные категории локации
// показываются всегда, без пропусков, а обманки из case_decoy_categories
// добирают список примерно до этого размера.
const TARGET_POOL_SIZE = 11;

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
    .select("id, name, generic_category")
    .eq("case_id", purchase.case_id)
    .eq("location_id", session.current_location_id)
    .is("granted_by_character_id", null)
    .order("name");

  if (poolError) {
    return NextResponse.json({ error: "Не удалось загрузить список улик" }, { status: 500 });
  }

  // Облако осмотра не должно спойлерить реальное название улики — показываем
  // generic_category (маскирующую категорию вроде "Книги и блокноты").
  // Фолбэк на name — только для случая, если у какой-то локационной улики
  // категория не заполнена (не должно случаться в норме).
  const realItems = (pool ?? []).map((item) => ({
    id: item.id,
    name: item.generic_category ?? item.name,
  }));

  // Реальных категорий этой локации мало — 5 вариантов = угадывание почти
  // без риска. Добираем список честными обманками из case_decoy_categories
  // (Дело №9704), которых у этой улики за душой нет: выбор мимо них должен
  // выглядеть как обычный неверный вариант, не как "заведомая пустышка"
  // (см. .../evidence/check).
  const decoysNeeded = TARGET_POOL_SIZE - realItems.length;
  let decoyItems: { id: string; name: string }[] = [];

  if (decoysNeeded > 0) {
    const realLabels = new Set(realItems.map((item) => item.name));
    const { data: decoyCategories } = await db
      .from("case_decoy_categories")
      .select("id, label")
      .eq("case_id", purchase.case_id);

    const availableDecoys = (decoyCategories ?? []).filter(
      (decoy) => !realLabels.has(decoy.label)
    );
    decoyItems = shuffle(availableDecoys)
      .slice(0, decoysNeeded)
      .map((decoy) => ({ id: decoy.id, name: decoy.label }));
  }

  return NextResponse.json({ pool: shuffle([...realItems, ...decoyItems]) });
}