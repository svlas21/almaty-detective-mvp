/** Женский род по ФИО: отчество на -овна/-евна/-ична или имя на -а/-я. */
const MALE_A = new Set(["Никита", "Илья", "Кузьма", "Фома", "Савва", "Лука", "Муса", "Иса", "Аса"]);

export function isFemaleName(name?: string | null): boolean {
  const words = (name ?? "").replace(/[()«»"]/g, " ").split(/\s+/).filter(Boolean);
  if (words.some((w) => /(овна|евна|ична|инична)$/i.test(w))) return true;
  const first = words[0] ?? "";
  return /[ая]$/i.test(first) && !MALE_A.has(first);
}

/** «Опрошен» / «Опрошена» и т. п. */
export function byGender(name: string | null | undefined, male: string, female: string): string {
  return isFemaleName(name) ? female : male;
}
