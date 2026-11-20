import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { anyCollected, requiresAnySatisfied } from "@/lib/graphRules";
import { cached } from "@/lib/caseCache";

export const dynamic = "force-dynamic";

export async function GET(
  _req: NextRequest,
  { params }: { params: { sessionId: string } }
) {
  const db = supabaseAdmin();
  const { sessionId } = params;

  // Запросы сгруппированы по зависимостям и идут параллельно: раньше их было
  // 16 подряд (каждый — полный сетевой круг до Supabase, ~0.35 с), теперь 4 круга.
  const NO_ID = "00000000-0000-0000-0000-000000000000";

  // Круг 1: партия и её состояние
  const [sessionRes, stateRes] = await Promise.all([
    db.from("game_sessions").select("*").eq("id", sessionId).single(),
    db.from("session_state").select("*").eq("session_id", sessionId).single(),
  ]);
  const session = sessionRes.data;
  if (sessionRes.error || !session) {
    return NextResponse.json({ error: "Партия не найдена" }, { status: 404 });
  }
  const state = stateRes.data;
  if (stateRes.error || !state) {
    return NextResponse.json({ error: "Состояние партии не найдено" }, { status: 404 });
  }

  // Круг 2: дело по покупке (кэш — не меняется)
  const caseId = await cached(`purchase-case:${session.purchase_id}`, async () => {
    const { data } = await db.from("purchases").select("case_id").eq("id", session.purchase_id).single();
    return data?.case_id ?? NO_ID;
  });

  // Круг 3: всё по делу — одновременно, из короткого кэша (данные дела, не партии)
  const [
    caseRecordRes,
    caseLocationsRes,
    caseSuspectsRes,
    caseExpertsRes,
    autoGrantRes,
    phoneCallsRes,
    avtomobilRes,
    topicsRes,
    accusationRes,
  ] = await cached(`case-static:${caseId}`, () => Promise.all([
    db.from("cases").select("map_image_url").eq("id", caseId).single(),
    // все поля: отсюда же берётся текущая локация (без отдельного запроса)
    db.from("locations").select("*").eq("case_id", caseId),
    db
      .from("characters")
      .select(
        "id, name, role, intro_text, fixed_questions, location_id, portrait_url, is_suspect, is_case_subject, mentions, reactions, unlock_evidence_ids"
      )
      .eq("case_id", caseId)
      .eq("is_expert", false),
    // Эксперты-консультанты — доступны всей карточкой с начала игры (вкладка «Экспертиза»).
    db
      .from("characters")
      .select("id, name, role, specialization, intro_text, fixed_questions, portrait_url")
      .eq("case_id", caseId)
      .eq("is_expert", true),
    // Автовыдача улик (supabase/011_graph_rules.sql)
    db.from("evidence").select("id, name, requires_any").eq("case_id", caseId).eq("auto_grant", true),
    db
      .from("phone_calls")
      .select("id, caller_role, caller_name, style, unlock_condition_key, dialogue_text, unlocks_location_id, order_index, characters(name)")
      .eq("case_id", caseId)
      .order("order_index", { ascending: true }),
    db.from("evidence").select("id").eq("case_id", caseId).eq("name", "Автомобиль потерпевшего").maybeSingle(),
    db
      .from("topics")
      .select(
        "id, label, unlock_evidence_id, unlock_character_id, unlock_location_id, unlock_reaction_character_id, unlock_reaction_evidence_id, unlock_question_character_id, unlock_question_index, subject_character_id"
      )
      .eq("case_id", caseId)
      .order("order_index", { ascending: true }),
    db.from("case_accusation").select("required_evidence_ids, accomplices").eq("case_id", caseId).maybeSingle(),
  ]));
  const location = (caseLocationsRes.data ?? []).find((l: { id: string }) => l.id === session.current_location_id) ?? null;
  const caseRecord = caseRecordRes.data;
  const caseLocations = caseLocationsRes.data;
  const caseSuspects = caseSuspectsRes.data;
  const caseExperts = caseExpertsRes.data;
  const autoGrantEvidence = autoGrantRes.data;
  const casePhoneCalls = phoneCallsRes.data;
  const avtomobilEvidence = avtomobilRes.data;
  const caseTopics = topicsRes.data;
  const accusation = accusationRes.data;

  // Все записи в session_state за этот запрос собираем в одну (круг 4)
  const stateUpdate: Record<string, unknown> = {};

  const autoGranted = (autoGrantEvidence ?? []).filter(
    (e) => !state.collected_evidence.includes(e.id) && requiresAnySatisfied(e.requires_any, state.collected_evidence)
  );
  if (autoGranted.length > 0) {
    const now = new Date().toISOString();
    state.collected_evidence = [...state.collected_evidence, ...autoGranted.map((e) => e.id)];
    state.discovered_evidence = Array.from(
      new Set([...(state.discovered_evidence ?? []), ...autoGranted.map((e) => e.id)])
    );
    state.log = [
      ...(state.log ?? []),
      ...autoGranted.map((e) => ({ type: "evidence", outcome: "found", evidenceName: e.name, source: "ГУВД", at: now })),
    ];
    stateUpdate.collected_evidence = state.collected_evidence;
    stateUpdate.discovered_evidence = state.discovered_evidence;
    stateUpdate.log = state.log;
  }

  // Вопросы протокола с условием (поле requires у элемента fixed_questions):
  // показываются, только когда все указанные улики собраны.
  const visibleQuestions = (questions: unknown) =>
    Array.isArray(questions)
      ? questions
          // idx — индекс в полном протоколе: после скрытия вопросов с условием
          // позиции на клиенте съезжают, а question-viewed ищет вопрос по полному списку
          .map((q: { requires?: string[] }, idx: number) => ({ ...q, idx }))
          .filter(
            (q: { requires?: string[] }) =>
              !q?.requires || q.requires.every((id) => state.collected_evidence.includes(id))
          )
      : questions;

  const experts = (caseExperts ?? []).map((expert) => ({
    ...expert,
    fixed_questions: visibleQuestions(expert.fixed_questions),
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
  const rinatCharacter = (caseExperts ?? []).find((c) => c.name === "Ринат Абишев");
  const seitovaCharacter = (caseExperts ?? []).find((c) => c.name === "Гульнара Ержановна Сеитова");
  const kanCharacter = (caseExperts ?? []).find((c) => c.name === "Юрий Николаевич Кан");
  const viewedCharacters: string[] = state.viewed_characters ?? [];
  const viewedReactions: string[] = state.viewed_reactions ?? [];
  const viewedCalls: string[] = state.viewed_calls ?? [];

  // Звонки (Дело №9704): живые входящие вызовы во время партии — отдельный
  // механизм от "Звонок Марата" (та улика по-прежнему собирается и
  // показывается через present/route.ts, локацию она больше не открывает).
  // unlock_condition_key — не универсальный движок условий, а просто метка;
  // реальные условия прописаны здесь же, тем же паттерном, что и
  // apartmentUnlockCondition/parkingUnlockCondition выше.
  const allExpertsInterviewed =
    !!seitovaCharacter &&
    !!rinatCharacter &&
    !!kanCharacter &&
    viewedCharacters.includes(seitovaCharacter.id) &&
    viewedCharacters.includes(rinatCharacter.id) &&
    viewedCharacters.includes(kanCharacter.id);

  const callUnlockConditions: Record<string, boolean> = {
    all_experts_interviewed: allExpertsInterviewed,
  };


  // Общие ключи условий (supabase/039): «evidence:<id>[,<id>…]» — у игрока есть
  // все перечисленные улики; «any:<id>|<id>…» — есть хотя бы одна.
  // id — это id улик в БД. Остальные ключи — именованные условия выше.
  const callConditionMet = (key: string): boolean => {
    if (key.startsWith("evidence:")) {
      const ids = key.slice("evidence:".length).split(",").map((x) => x.trim()).filter(Boolean);
      return ids.length > 0 && ids.every((id) => state.collected_evidence.includes(id));
    }
    if (key.startsWith("any:")) {
      const ids = key.slice("any:".length).split("|").map((x) => x.trim()).filter(Boolean);
      return ids.some((id) => state.collected_evidence.includes(id));
    }
    return !!callUnlockConditions[key];
  };

  const pendingCallRow = (casePhoneCalls ?? []).find(
    (c) => !viewedCalls.includes(c.id) && callConditionMet(c.unlock_condition_key)
  );

  const pendingCall = pendingCallRow
    ? {
        id: pendingCallRow.id,
        callerName:
          (pendingCallRow.characters as unknown as { name: string } | null)?.name ?? pendingCallRow.caller_name ?? "",
        callerRole: pendingCallRow.caller_role,
        dialogueText: pendingCallRow.dialogue_text,
        style: pendingCallRow.style ?? "mobile",
      }
    : null;

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

  // Парковка у посольства — открывается, когда игрок увидел реакцию эксперта
  // Рината на "Автомобиль потерпевшего" (тот же паттерн, что и открытие
  // Кв. «Марата» через реакцию Рината на "Звонок Марата", см. .../present).
  // Раньше условием был допрос Валентины — заменено полностью, без fallback.

  const parkingUnlockCondition =
    !!rinatCharacter &&
    !!avtomobilEvidence &&
    viewedReactions.includes(`${rinatCharacter.id}:${avtomobilEvidence.id}`);
  if (parkingLocation && parkingUnlockCondition) discoveredLocationIds.add(parkingLocation.id);

  // Открытие локаций по уликам из данных (locations.unlock_evidence_ids,
  // supabase/011_graph_rules.sql): достаточно любой из перечисленных улик.
  for (const loc of caseLocations ?? []) {
    const ids = (loc as { unlock_evidence_ids?: string[] | null }).unlock_evidence_ids;
    if (ids && ids.length > 0 && anyCollected(ids, state.collected_evidence)) {
      discoveredLocationIds.add(loc.id);
    }
  }

  const newlyDiscoveredLocationIds = [...discoveredLocationIds].filter(
    (id) => !state.discovered_locations.includes(id)
  );
  if (newlyDiscoveredLocationIds.length > 0) {
    stateUpdate.discovered_locations = [...discoveredLocationIds];
  }

  const allLocations = (caseLocations ?? []).map((loc) => {
    const unlocked = discoveredLocationIds.has(loc.id);
    if (unlocked) {
      const { unlock_evidence_ids: _unlockIds, ...publicLoc } = loc as typeof loc & { unlock_evidence_ids?: unknown };
      return { ...publicLoc, unlocked: true };
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

  // "Спросить про..." (Дело №9704): темы, открытые по улике — доступны для
  // вопроса любому обнаруженному персонажу (см. ask/route.ts), не привязаны
  // к конкретной карточке в отличие от fixed_questions/reactions.

  // Условия открытия темы (см. supabase/008_topic_unlock_conditions.sql,
  // 010_viewed_questions.sql) — та же проверка, что в ask/route.ts, здесь
  // только для формирования списка доступных тем (реальный гейт — там).
  // subject_character_id (см. 009_topic_subject_character.sql) сюда
  // прокидывается как есть — список общий для всех персонажей, а
  // исключение "тема про самого себя" применяется на фронтенде, где
  // известно, чья карточка открыта.
  const viewedQuestions: string[] = state.viewed_questions ?? [];

  const topics = (caseTopics ?? [])
    .filter(
      (t) =>
        (!t.unlock_evidence_id || state.collected_evidence.includes(t.unlock_evidence_id)) &&
        (!t.unlock_character_id || viewedCharacters.includes(t.unlock_character_id)) &&
        (!t.unlock_location_id || discoveredLocationIds.has(t.unlock_location_id)) &&
        (!t.unlock_reaction_character_id ||
          !t.unlock_reaction_evidence_id ||
          viewedReactions.includes(`${t.unlock_reaction_character_id}:${t.unlock_reaction_evidence_id}`)) &&
        (!t.unlock_question_character_id ||
          t.unlock_question_index === null ||
          viewedQuestions.includes(`${t.unlock_question_character_id}:${t.unlock_question_index}`))
    )
    .map((t) => ({ id: t.id, label: t.label, subject_character_id: t.subject_character_id }));

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

  // «Опрошен» = с человеком реально говорили: открыт ответ протокола,
  // задан вопрос по теме или предъявлена улика. Просто открыть карточку — не допрос.
  const interviewedIds = new Set<string>();
  for (const k of [...viewedQuestions, ...viewedReactions]) interviewedIds.add(k.split(":")[0]);
  const askedNames = new Set<string>(
    ((state.log ?? []) as { type?: string; characterName?: string }[])
      .filter((e) => e.type === "ask" && e.characterName)
      .map((e) => e.characterName as string)
  );

  const allSuspects = (caseSuspects ?? []).map((suspectRow) => {
    // reactions не спредим в ответ клиенту как есть — это спойлер (текст
    // реакции на конкретную улику до того, как игрок её предъявил, см.
    // present/route.ts). Наружу отдаём только has_reactions: непустой ли
    // объект, признак того, что для этого персонажа есть настоящий контент
    // "Предъявить улику" — не только is_suspect=true (см. Валентина/007).
    const { mentions: _mentions, reactions, unlock_evidence_ids: unlockEvidenceIds, ...suspect } = suspectRow;
    // Персонаж с unlock_evidence_ids (supabase/011_graph_rules.sql) остаётся
    // скрытым, пока не собрана любая из этих улик, даже если игрок уже был в его локации.
    const unlockedByEvidence = anyCollected(unlockEvidenceIds, state.collected_evidence);
    const hasReactions = Object.keys(reactions ?? {}).length > 0;
    const isValentina = suspect.id === valentinaCharacter?.id;

    // Валентину показывает/скрывает ТОЛЬКО motherUnlocked — mentions-механика
    // её не касается ни в какую сторону (см. п.4 ТЗ), поэтому для неё mentions
    // не проверяется вовсе, что бы ни было в session_state.
    const discovered =
      unlockedByEvidence &&
      (isValentina
        ? state.discovered_characters.includes(suspect.id) && motherUnlocked
        : state.discovered_characters.includes(suspect.id));
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
        : visibleQuestions(suspect.fixed_questions);
    // "В розыске" берётся из текста role (например «В РОЗЫСКЕ — личность не
    // установлена» у «Марата») — отдельного поля-статуса в схеме нет.
    const wanted = (suspect.role ?? "").toUpperCase().includes("РОЗЫСК");
    return {
      ...suspect,
      fixed_questions: fixedQuestions,
      unlocked: true,
      mentioned: false,
      // Открывал ли игрок карточку этого персонажа (viewedCharacters
      // фиксируется в /suspects/[id]/view при первом открытии — см. комментарий
      // там), независимо от is_suspect: сам факт "поговорили"/"допросили"
      // одинаково значим и для подозреваемых, и для свидетелей. Где именно
      // показывать бейдж (например, только для is_suspect на "Люди здесь")
      // решают уже потребители поля, не этот флаг.
      viewed: viewedCharacters.includes(suspect.id),
      interviewed: interviewedIds.has(suspect.id) || askedNames.has(suspect.name),
      wanted,
      has_reactions: hasReactions,
    };
  });

  // Круг 4: детали собранных улик + запись изменений состояния — параллельно
  const [collectedRes] = await Promise.all([
    db
      .from("evidence")
      .select("id, name, description, generic_category, image_url, kind")
      .in("id", state.collected_evidence.length ? state.collected_evidence : [NO_ID]),
    Object.keys(stateUpdate).length > 0
      ? db.from("session_state").update(stateUpdate).eq("session_id", sessionId)
      : Promise.resolve(null),
  ]);
  const collectedEvidenceDetails = collectedRes.data;

  // Готовность к финальному экрану "Обвинение" (Дело №9704): считается на
  // сервере из уже собранных полей session_state, наружу отдаётся только
  // булев флаг — ни required_evidence_ids, ни organizer/accomplices сюда
  // не попадают, чтобы не спойлерить условия до самого экрана.

  const requiredEvidenceIds: string[] = accusation?.required_evidence_ids ?? [];
  const accomplices: { character_id: string; required_reaction_evidence_id: string }[] =
    accusation?.accomplices ?? [];

  const accusationUnlocked =
    !!accusation &&
    requiredEvidenceIds.every((id) => state.collected_evidence.includes(id)) &&
    accomplices.every((acc) =>
      viewedReactions.includes(`${acc.character_id}:${acc.required_reaction_evidence_id}`)
    );

  return NextResponse.json({
    session,
    location,
    allLocations,
    allSuspects,
    experts,
    motherUnlocked,
    accusationUnlocked,
    pendingCall,
    topics,
    mapImageUrl: caseRecord?.map_image_url ?? null,
    collectedEvidenceCount: state.collected_evidence.length,
    collectedEvidence: collectedEvidenceDetails ?? [],
    log: state.log ?? [],
    // «персонаж:улика» — что игрок уже предъявлял (для пометки в «Предъявить улику»)
    viewedReactions,
  });
}
