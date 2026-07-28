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
    .select("*")
    .eq("id", sessionId)
    .single();

  if (sessionError || !session) {
    return NextResponse.json({ error: "Партия не найдена" }, { status: 404 });
  }

  const { data: state, error: stateError } = await db
    .from("session_state")
    .select("*")
    .eq("session_id", sessionId)
    .single();

  if (stateError || !state) {
    return NextResponse.json({ error: "Состояние партии не найдено" }, { status: 404 });
  }

  const { data: location } = await db
    .from("locations")
    .select("*")
    .eq("id", session.current_location_id)
    .single();

  const { data: purchase } = await db
    .from("purchases")
    .select("case_id")
    .eq("id", session.purchase_id)
    .single();

  const { data: caseRecord } = await db
    .from("cases")
    .select("map_image_url")
    .eq("id", purchase?.case_id)
    .single();

  const { data: caseLocations } = await db
    .from("locations")
    .select("id, name, image_url, map_pos_x, map_pos_y, preview_image_url, short_description, is_searchable")
    .eq("case_id", purchase?.case_id ?? "00000000-0000-0000-0000-000000000000");

  const { data: caseSuspects } = await db
    .from("characters")
    .select("id, name, role, intro_text, fixed_questions, location_id, portrait_url, is_suspect, mentions")
    .eq("case_id", purchase?.case_id ?? "00000000-0000-0000-0000-000000000000")
    .eq("is_expert", false);

  // Эксперты-консультанты (ГУВД технически, но в игре живут отдельно от
  // "Подозреваемых и свидетелей") — доступны всей карточкой с начала игры,
  // без discovered/mentioned-механики: см. вкладку "Экспертиза".
  const { data: caseExperts } = await db
    .from("characters")
    .select("id, name, role, specialization, intro_text, fixed_questions, portrait_url")
    .eq("case_id", purchase?.case_id ?? "00000000-0000-0000-0000-000000000000")
    .eq("is_expert", true);

  const experts = (caseExperts ?? []).map((expert) => ({
    ...expert,
    is_expert: true,
    is_suspect: false,
    unlocked: true,
  }));

  const aliyaLocation = (caseLocations ?? []).find((l) => l.name === "Квартира Сартакова");
  const guvdLocation = (caseLocations ?? []).find((l) => l.name === "ГУВД города Алматы");
  const parkingLocation = (caseLocations ?? []).find((l) => l.name === "Парковка у посольства");

  const aliyaCharacter = (caseSuspects ?? []).find((c) => c.name === "Алия Сартакова");
  const valentinaCharacter = (caseSuspects ?? []).find((c) => c.name === "Валентина Сартакова");
  const daniyarCharacter = (caseSuspects ?? []).find((c) => c.name === "Данияр Ахметов");
  const victorCharacter = (caseSuspects ?? []).find((c) => c.name === "Виктор Гринько");
  const viewedCharacters: string[] = state.viewed_characters ?? [];

  // Триггеры открытия локаций (Дело №9704): считаются заново на каждый
  // запрос из уже собранных полей session_state, без новых столбцов.
  // Персистим только НОВЫЕ открытия — чтобы discovered_locations был
  // источником правды и для карты, и для проверки "локация открыта" в travel.
  const discoveredLocationIds = new Set<string>(state.discovered_locations);

  // ГУВД — хаб дела, открыт с первой минуты партии.
  if (guvdLocation) discoveredLocationIds.add(guvdLocation.id);

  // Квартира Сартакова — открывается, когда допрошены и Данияр, и Виктор
  // (оба сейчас сидят в ГУВД — встретить их можно сразу после интро).
  const apartmentUnlockCondition =
    !!daniyarCharacter &&
    !!victorCharacter &&
    viewedCharacters.includes(daniyarCharacter.id) &&
    viewedCharacters.includes(victorCharacter.id);
  if (aliyaLocation && apartmentUnlockCondition) discoveredLocationIds.add(aliyaLocation.id);

  // Парковка у посольства — открывается, когда допрошена Валентина Сартакова
  // (в отличие от Квартиры Сартакова, условие на одного персонажа, не двух).
  const parkingUnlockCondition =
    !!valentinaCharacter && viewedCharacters.includes(valentinaCharacter.id);
  if (parkingLocation && parkingUnlockCondition) discoveredLocationIds.add(parkingLocation.id);

  const newlyDiscoveredLocationIds = [...discoveredLocationIds].filter(
    (id) => !state.discovered_locations.includes(id)
  );
  if (newlyDiscoveredLocationIds.length > 0) {
    await db
      .from("session_state")
      .update({ discovered_locations: [...discoveredLocationIds] })
      .eq("session_id", sessionId);
  }

  const allLocations = (caseLocations ?? []).map((loc) => {
    const unlocked = discoveredLocationIds.has(loc.id);
    if (unlocked) {
      return { ...loc, unlocked: true };
    }
    return { id: loc.id, map_pos_x: loc.map_pos_x, map_pos_y: loc.map_pos_y, unlocked: false };
  });

  // Условное открытие "Валентина Сартакова" / 4-й вопрос Алии (Дело №9704):
  // считается заново на каждый запрос, не кешируется.
  // Валентину открывает сам факт разговора с Алией (собранные улики квартиры
  // для этого больше не нужны).
  const motherUnlocked = !!aliyaCharacter && viewedCharacters.includes(aliyaCharacter.id);

  const aliyaStage2 =
    motherUnlocked && !!valentinaCharacter && viewedCharacters.includes(valentinaCharacter.id);

  const ALIYA_FOLLOWUP_QUESTION = {
    q: "Дом на Кок Тобе — вы правда не расстроились, что он остался Игорю?",
    a: '(после паузы, тише) «Расстроилась, чего уж там. Обидно было — мы вместе о нём мечтали, а вышло, что достраивал он его уже один, для новой жизни. Но это было три года назад». (пожимает плечами) «Сейчас у меня всё хорошо, слава богу — в деньгах не нуждаюсь. Обижаться давно не на что, да и поздно уже».',
  };

  // Кого называют по имени персонажи, чьи карточки уже открывали (допрашивали/
  // разговаривали) — такой человек появляется на доске как "mentioned", даже
  // если его ещё не встретили лично по локации.
  const mentionedIds = new Set<string>();
  for (const c of caseSuspects ?? []) {
    if (viewedCharacters.includes(c.id)) {
      for (const m of c.mentions ?? []) mentionedIds.add(m);
    }
  }

  const allSuspects = (caseSuspects ?? []).map((suspectRow) => {
    const { mentions: _mentions, ...suspect } = suspectRow;
    const isValentina = suspect.id === valentinaCharacter?.id;

    // Валентину показывает/скрывает ТОЛЬКО motherUnlocked — mentions-механика
    // её не касается ни в какую сторону (см. п.4 ТЗ), поэтому для неё mentions
    // не проверяется вовсе, что бы ни было в session_state.
    const discovered = isValentina
      ? state.discovered_characters.includes(suspect.id) && motherUnlocked
      : state.discovered_characters.includes(suspect.id);
    const mentioned = !isValentina && !discovered && mentionedIds.has(suspect.id);

    if (!discovered && !mentioned) {
      return { id: suspect.id, unlocked: false, mentioned: false };
    }

    if (mentioned) {
      // Карточка-"призрак": известно только имя/роль, фото и допрос закрыты.
      return {
        id: suspect.id,
        unlocked: false,
        mentioned: true,
        name: suspect.name,
        role: suspect.role,
      };
    }

    const isAliya = suspect.id === aliyaCharacter?.id;
    const fixedQuestions =
      isAliya && aliyaStage2
        ? [...(suspect.fixed_questions ?? []), ALIYA_FOLLOWUP_QUESTION]
        : suspect.fixed_questions;
    // "В розыске" берётся из текста role (например «В РОЗЫСКЕ — личность не
    // установлена» у «Марата») — отдельного поля-статуса в схеме нет.
    const wanted = (suspect.role ?? "").toUpperCase().includes("РОЗЫСК");
    return {
      ...suspect,
      fixed_questions: fixedQuestions,
      unlocked: true,
      mentioned: false,
      // "Опрошен" — только для подозреваемых (их допрашивают); со свидетелями
      // вроде начальника ГУВД или Валентины просто разговаривают.
      viewed: suspect.is_suspect === true && viewedCharacters.includes(suspect.id),
      wanted,
    };
  });

  const { data: collectedEvidenceDetails } = await db
    .from("evidence")
    .select("id, name, description")
    .in("id", state.collected_evidence.length ? state.collected_evidence : ["00000000-0000-0000-0000-000000000000"]);

  return NextResponse.json({
    session,
    location,
    allLocations,
    allSuspects,
    experts,
    motherUnlocked,
    mapImageUrl: caseRecord?.map_image_url ?? null,
    collectedEvidenceCount: state.collected_evidence.length,
    collectedEvidence: collectedEvidenceDetails ?? [],
    log: state.log ?? [],
  });
}
