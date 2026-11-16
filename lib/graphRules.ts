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
export const RULE_GROUP_REPEAT = "«Я уже всё сказал(а). Больше мне добавить нечего».";

/**
 * Результат предъявления улики персонажу по reaction_rules.
 * null — у персонажа нет правил на эту улику (вызывающий код применит старую логику).
 */
export function resolveReactionRules(
  rules: ReactionRule[] | null | undefined,
  evidenceId: string,
  collected: string[],
  isExpert: boolean
): { text: string; grants: string[] } | null {
  const forEvidence = (rules ?? []).filter((r) => r.on === evidenceId);
  if (forEvidence.length === 0) return null;

  const ready = forEvidence.filter((r) => (r.requires ?? []).every((id) => collected.includes(id)));
  if (ready.length === 0) {
    return { text: isExpert ? RULE_NOT_READY_EXPERT : RULE_NOT_READY_PERSON, grants: [] };
  }

  const texts: string[] = [];
  const grants = new Set<string>();
  for (const rule of ready) {
    const ruleGrants = rule.grants ?? [];
    const alreadyGiven = ruleGrants.length > 0 && ruleGrants.every((id) => collected.includes(id));
    if (rule.group && alreadyGiven) {
      const repeat = rule.repeat_text ?? RULE_GROUP_REPEAT;
      if (!texts.includes(repeat)) texts.push(repeat);
      continue;
    }
    texts.push(rule.text);
    ruleGrants.forEach((id) => grants.add(id));
  }
  return { text: texts.join("\n\n"), grants: [...grants] };
}
