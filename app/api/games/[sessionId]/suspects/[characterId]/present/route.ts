import { NextRequest, NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabaseAdmin";
import { gameMinutes, stamp } from "@/lib/journal";
import { requireOnSite } from "@/lib/onSite";
import { resolveReactionRules, type ReactionRule } from "@/lib/graphRules";
import { isFemaleName } from "@/lib/gender";

export const dynamic = "force-dynamic";

// Если своей реакции на улику нет — короткая реплика вместо одной и той же
// заглушки. Учитывается, ЧЬЯ это улика (человек сам её дал / это его
// показания или заключение) и КАКОГО она вида: вещь, показания, экспертиза,
// документ. Выбор детерминированный: тот же персонаж на ту же улику отвечает
// одинаково. Только речь, никаких действий с предметом.
type EvidenceKind = "thing" | "testimony" | "expertise" | "document";

const FALLBACK: Record<"person" | "expert", Record<EvidenceKind, string[]>> = {
  person: {
    thing: [
      "— Не понимаю, к чему вы клоните.",
      "— Не знаю, что вам на это сказать.",
      "— Про это мне сказать нечего.",
      "— Это не ко мне. Спросите других.",
    ],
    testimony: [
      "— Мало ли кто что говорит. Я за чужие слова не отвечаю.",
      "— Это пусть они и объясняют. Мне добавить нечего.",
      "— Это чужие слова. С них и спрашивайте.",
      "— Слышу. Мне на это сказать нечего.",
      "— Я своё уже рассказал{|а}. За других не отвечаю.",
    ],
    expertise: [
      "— В экспертизах я не разбираюсь. Что там написано, вам виднее.",
      "— Это ваши бумаги, учёные. Мне сказать нечего.",
    ],
    document: [
      "— Бумаги — это ваше дело. Мне сказать нечего.",
      "— Что там в ваших справках, я не знаю.",
    ],
  },
  expert: {
    thing: [
      "— По этому материалу заключения пока нет.",
      "— Тут мне зацепиться не за что.",
      "— Это не по моей части.",
    ],
    testimony: [
      "— Показания — это к следователю, не ко мне. Я работаю с материалом.",
      "— Слова к делу не приложишь. Принесите вещь — посмотрю.",
    ],
    expertise: [
      "— Это заключение коллег. Оспаривать не буду, добавить нечего.",
      "— С выводами {согласен|согласна}. От себя пока ничего не добавлю.",
    ],
    document: [
      "— Справка как справка. По моей части тут ничего.",
      "— Это не по моей части.",
    ],
  },
};

const OWN: Record<"person" | "expert", Record<EvidenceKind, string>> = {
  person: {
    thing: "— Я же сам{|а} вам это отдал{|а}. Что ещё?",
    testimony: "— Я вам это уже рассказал{|а}. Добавить нечего.",
    expertise: "— Я вам это уже рассказал{|а}. Добавить нечего.",
    document: "— Я же сам{|а} вам это дал{|а}.",
  },
  expert: {
    thing: "— Этот материал я уже смотрел{|а}. Всё в заключении.",
    testimony: "— Это мои выводы. Пока новых материалов нет — добавить нечего.",
    expertise: "— Это моё заключение. Пока новых материалов нет — добавить нечего.",
    document: "— Это я вам и готовил{|а}. Всё, что было, там указано.",
  },
};

function fallbackReaction(
  characterId: string,
  characterName: string,
  evidenceId: string,
  isExpert: boolean,
  kind: string | null | undefined,
  own: boolean,
  lines?: Record<string, string | string[]> | null
) {
  const who = isExpert ? "expert" : "person";
  const k: EvidenceKind = (["thing", "testimony", "expertise", "document"] as const).includes(kind as EvidenceKind)
    ? (kind as EvidenceKind)
    : "thing";
  let text: string;
  // своя манера персонажа (поле fallback_lines), если задана
  const ownLine = lines?.[`own_${k}`] ?? (k === "testimony" ? undefined : lines?.own_expertise);
  const personal = lines?.[k];
  if (own && typeof ownLine === "string") {
    text = ownLine;
  } else if (own) {
    text = OWN[who][k];
  } else if (Array.isArray(personal) && personal.length > 0) {
    let h = 0;
    for (const ch of characterId + evidenceId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    text = personal[h % personal.length];
  } else {
    const pool = FALLBACK[who][k];
    let h = 0;
    for (const ch of characterId + evidenceId) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    text = pool[h % pool.length];
  }
  // {мужской|женский} — согласование по роду
  const female = isFemaleName(characterName);
  return text.replace(/\{([^|{}]*)\|([^|{}]*)\}/g, (_: string, m: string, f: string) => (female ? f : m));
}

export async function POST(
  req: NextRequest,
  { params }: { params: { sessionId: string; characterId: string } }
) {
  const { evidenceId } = await req.json();
  const db = supabaseAdmin();
  const { sessionId, characterId } = params;
  // Игровое время для ежедневника — параллельно с остальными запросами
  const gmPromise = gameMinutes(db, sessionId);

  // Состояние, персонаж и улика читаются одновременно (раньше — по очереди);
  // параллельно — проверка «следователь на месте» (lib/onSite.ts)
  const [offSite, stateRes, characterRes, evidenceRes] = await Promise.all([
    requireOnSite(db, sessionId, characterId),
    db
      .from("session_state")
      .select(
        "discovered_characters, discovered_evidence, collected_evidence, discovered_locations, viewed_reactions, log"
      )
      .eq("session_id", sessionId)
      .single(),
    db
      .from("characters")
      .select("case_id, name, reactions, reaction_rules, fixed_questions, fallback_lines, confession_text, confession_requires_evidence, is_expert")
      .eq("id", characterId)
      .single(),
    db.from("evidence").select("name, kind").eq("id", evidenceId).single(),
  ]);
  const { data: state, error: stateError } = stateRes;
  const { data: character, error: characterError } = characterRes;
  const evidence = evidenceRes.data;

  if (offSite) return offSite;

  if (stateError || !state) {
    return NextResponse.json({ error: "Партия не найдена" }, { status: 404 });
  }

  if (!state.discovered_characters.includes(characterId)) {
    return NextResponse.json({ error: "Этот подозреваемый ещё не обнаружен" }, { status: 403 });
  }

  if (!state.collected_evidence.includes(evidenceId)) {
    return NextResponse.json({ error: "Сначала найдите эту улику" }, { status: 400 });
  }

  if (characterError || !character) {
    return NextResponse.json({ error: "Подозреваемый не найден" }, { status: 404 });
  }

  // Правила из данных (supabase/011_graph_rules.sql): реплика зависит от уже
  // собранных улик и может выдать новые. Если правил на эту улику нет —
  // прежняя логика (reactions-словарь + хардкод-цепочки ниже).
  const ruleResult = resolveReactionRules(
    character.reaction_rules as ReactionRule[] | null,
    evidenceId,
    state.collected_evidence,
    !!character.is_expert
  );

  // «Своя» улика: этот человек её выдал (правилом реакции или вопросом протокола)
  const own =
    ((character.reaction_rules as ReactionRule[] | null) ?? []).some((r) => (r.grants ?? []).includes(evidenceId)) ||
    ((character.fixed_questions as { grants_evidence_id?: string }[] | null) ?? []).some(
      (q) => q?.grants_evidence_id === evidenceId
    );
  const reaction =
    ruleResult?.text ??
    character.reactions?.[evidenceId] ??
    fallbackReaction(
      characterId,
      character.name,
      evidenceId,
      !!character.is_expert,
      evidence?.kind,
      own,
      character.fallback_lines as Record<string, string | string[]> | null
    );

  // "Reaction chain evidence" (Дело №9704): улика попадает в инвентарь не обыском
  // и не допросом, а после того как игрок увидел конкретную реакцию конкретного
  // персонажа на другую улику. Переходы:
  // Ежедневник → реакция Виктора ИЛИ Данияра → "Звонок Марата".
  // Нож (с отпечатками Олжаса) ИЛИ Тело потерпевшего → реакция Олжаса →
  // "Показания Олжаса" (Акт IV, Сцена 4 — см. обсуждение находки в подвале).
  // Записка от Игоря → реакция Сеитовой → "Частичный отпечаток на записке —
  // совпадение с Фархадом Мамаджановым" (открывает тему "Фархад Мамаджанов").
  // Звонок Марата → реакция Рината → "Адрес квартиры на Сейфулина".
  let collectedEvidence = state.collected_evidence;
  let discoveredEvidence = state.discovered_evidence ?? [];
  // Журнал расследования (Дело №9704): каждая улика, выданная реакцией на
  // предъявление, получает свою запись в log — иначе в журнале появляется
  // только "предъявили X персонажу Y" без следа новой найденной улики.
  const grantedEvidenceLogEntries: { type: "evidence"; outcome: "found"; evidenceName: string; source: string; at: string }[] = [];

  const grantChainedEvidence = async (grantedEvidenceName: string) => {
    const { data: granted } = await db
      .from("evidence")
      .select("id")
      .eq("case_id", character.case_id)
      .eq("name", grantedEvidenceName)
      .maybeSingle();

    if (granted && !collectedEvidence.includes(granted.id)) {
      collectedEvidence = [...collectedEvidence, granted.id];
      discoveredEvidence = Array.from(new Set([...discoveredEvidence, granted.id]));
      grantedEvidenceLogEntries.push({
        type: "evidence",
        outcome: "found",
        evidenceName: grantedEvidenceName,
        source: character.name,
        at: new Date().toISOString(),
      });
    }
  };

  for (const grantedId of ruleResult?.grants ?? []) {
    const { data: granted } = await db
      .from("evidence")
      .select("id, name")
      .eq("case_id", character.case_id)
      .eq("id", grantedId)
      .maybeSingle();
    if (granted && !collectedEvidence.includes(granted.id)) {
      collectedEvidence = [...collectedEvidence, granted.id];
      discoveredEvidence = Array.from(new Set([...discoveredEvidence, granted.id]));
      grantedEvidenceLogEntries.push({
        type: "evidence",
        outcome: "found",
        evidenceName: granted.name,
        source: character.name,
        at: new Date().toISOString(),
      });
    }
  }

  if (
    evidence?.name === "Ежедневник на столе" &&
    (character.name === "Виктор Гринько" || character.name === "Данияр Ахметов")
  ) {
    await grantChainedEvidence("Звонок Марата");
  }

  if (
    (evidence?.name === "Нож (с отпечатками Олжаса)" || evidence?.name === "Тело потерпевшего") &&
    character.name === "Олжас Бекенов"
  ) {
    await grantChainedEvidence("Показания Олжаса");
  }

  if (evidence?.name === "Записка от Игоря" && character.name === "Гульнара Ержановна Сеитова") {
    await grantChainedEvidence("Частичный отпечаток на записке — совпадение с Фархадом Мамаджановым");
  }

  if (evidence?.name === "Звонок Марата" && character.name === "Ринат Абишев") {
    await grantChainedEvidence("Адрес квартиры на Сейфулина");
  }

  // Открытие локации "Съёмная квартира «Марата»" теперь идёт только через
  // звонок Азамата после допроса всех экспертов (см. phone_calls в
  // state/route.ts и /calls/[callId]/answer) — реакция Рината на "Звонок
  // Марата" саму улику по-прежнему показывает, но локацию больше не открывает.

  // Факт "игрок предъявил улику X персонажу Y и увидел экран реакции" —
  // ключ для финального экрана "Обвинение" (case_accusation.accomplices[].
  // required_reaction_evidence_id), фиксируется на любую реакцию, включая
  // общую фразу-заглушку — экран реакции показывается в обоих случаях.
  const viewedReactionKey = `${characterId}:${evidenceId}`;
  const viewedReactions = Array.from(new Set([...(state.viewed_reactions ?? []), viewedReactionKey]));

  const gm = await gmPromise;
  await db
    .from("session_state")
    .update({
      collected_evidence: collectedEvidence,
      discovered_evidence: discoveredEvidence,
      viewed_reactions: viewedReactions,
      log: [
        ...(state.log ?? []),
        ...stamp([
        {
          type: "present",
          characterName: character.name,
          evidenceName: evidence?.name ?? "",
          reactionText: reaction,
          at: new Date().toISOString(),
        },
        ...grantedEvidenceLogEntries,
        ], gm),
      ],
    })
    .eq("session_id", sessionId);

  // Озвучка — только если реплика пришла из правила целиком (не заглушка)
  const audio = ruleResult && ruleResult.text === reaction ? ruleResult.audio ?? null : null;
  const response: { reaction: string; confession?: string; audio?: string | null } = { reaction, audio };

  if (
    character.confession_requires_evidence &&
    character.confession_requires_evidence.length > 0 &&
    character.confession_requires_evidence.every((id: string) => collectedEvidence.includes(id))
  ) {
    response.confession = character.confession_text;
  }

  return NextResponse.json(response);
}
