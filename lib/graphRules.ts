/**
 * Универсальные правила дела из данных (см. supabase/011_graph_rules.sql).
 * Всё здесь включается только для персонажей/улик/локаций, у которых
 * новые поля заполнены, — старое дело работает по прежней логике.
 */

export type ReactionRule = {
  id?: string;
  on: string;
  requires?: string[];
  text: string;
  grants?: string[];
  group?: string;
  /** Реплика, если сцена группы уже прошла другим вариантом. */
  repeat_text?: string;
  /** Резервная реплика: только если ни одна основная реакция на эту улику не готова. */
  fallback?: boolean;
  /** Поздний вариант: если готов, текст перечисленных реакций не показывается (их выдачи сохраняются). */
  supersedes?: string[];
  /** Озвучка реплики (Supabase Storage, tools/voice/lumean.mjs upload). */
  audio_url?: string | null;
};

/** null/пусто = условия нет; иначе нужен хотя бы один полностью собранный набор. */
export function requiresAnySatisfied(requiresAny: unknown, collected: string[]): boolean {
  if (!Array.isArray(requiresAny) || requiresAny.length === 0) return true;
  return requiresAny.some(
    (set) => Array.isArray(set) && set.every((id) => typeof id === "string" && collected.includes(id))
  );
}

/** null/пусто = условия нет; иначе собрана хотя бы одна из улик. */
export function anyCollected(ids: string[] | null | undefined, collected: string[]): boolean {
  if (!ids || ids.length === 0) return true;
  return ids.some((id) => collected.includes(id));
}

export const RULE_NOT_READY_EXPERT =
  "Пока мне не с чем это сопоставить. Принесите больше материалов — тогда скажу что-то определённое.";
export const RULE_NOT_READY_PERSON = "«Не понимаю, к чему вы клоните», — отвечает и отводит взгляд.";
export const RULE_GROUP_REPEAT = "«Я всё сказал{|а}. Больше мне добавить нечего».";

/**
 * Результат предъявления улики персонажу по reaction_rules.
 * null — у персонажа нет правил на эту улику (вызывающий код применит старую логику).
 */
export function resolveReactionRules(
  rules: ReactionRule[] | null | undefined,
  evidenceId: string,
  collected: string[],
  isExpert: boolean
): { text: string; grants: string[]; audio?: string | null } | null {
  const forEvidence = (rules ?? []).filter((r) => r.on === evidenceId);
  if (forEvidence.length === 0) return null;

  const allReady = forEvidence.filter((r) => (r.requires ?? []).every((id) => collected.includes(id)));
  // Основные реакции важнее резервных. Резервная — одна, самая точная
  // (с наибольшим числом выполненных условий), чтобы реплики не склеивались.
  const main = allReady.filter((r) => !r.fallback);
  const backup = allReady
    .filter((r) => r.fallback)
    .sort((a, b) => (b.requires?.length ?? 0) - (a.requires?.length ?? 0))
    .slice(0, 1);
  let ready = main.length > 0 ? main : backup;
  // Поздние варианты вытесняют текст прежних реплик (например, ложь до признания),
  // но улики, которые выдавала прежняя реакция, всё равно выдаются.
  const supersededIds = new Set(allReady.flatMap((r) => r.supersedes ?? []));
  const inherited = allReady.filter((r) => r.id && supersededIds.has(r.id));
  if (supersededIds.size > 0) ready = ready.filter((r) => !(r.id && supersededIds.has(r.id)));
  if (ready.length === 0) {
    return { text: isExpert ? RULE_NOT_READY_EXPERT : RULE_NOT_READY_PERSON, grants: [] };
  }

  const texts: string[] = [];
  const grants = new Set<string>();
  const audios: (string | null)[] = [];
  for (const rule of ready) {
    const ruleGrants = rule.grants ?? [];
    const alreadyGiven = ruleGrants.length > 0 && ruleGrants.every((id) => collected.includes(id));
    if (rule.group && alreadyGiven) {
      const repeat = rule.repeat_text ?? RULE_GROUP_REPEAT;
      if (!texts.includes(repeat)) texts.push(repeat);
      continue;
    }
    texts.push(rule.text);
    audios.push(rule.audio_url ?? null);
    ruleGrants.forEach((id) => grants.add(id));
  }
  for (const r of inherited) (r.grants ?? []).forEach((id) => grants.add(id));
  // Звук — только если прозвучит ровно одна реплика целиком (иначе текст и голос разойдутся)
  const audio = texts.length === 1 && audios.length === 1 ? audios[0] : null;
  return { text: texts.join("\n\n"), grants: [...grants], audio };
}
