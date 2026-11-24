/** Игровые часы дела 9704: начало — понедельник, 25 ноября 1996 года, 9:10 (вводная). */
export const CASE_START = new Date(1996, 10, 25, 9, 10);

export const MONTHS_NOM = ["Январь", "Февраль", "Март", "Апрель", "Май", "Июнь", "Июль", "Август", "Сентябрь", "Октябрь", "Ноябрь", "Декабрь"];
export const MONTHS_GEN = ["января", "февраля", "марта", "апреля", "мая", "июня", "июля", "августа", "сентября", "октября", "ноября", "декабря"];
export const WEEKDAYS = ["воскресенье", "понедельник", "вторник", "среда", "четверг", "пятница", "суббота"];

/** Дата и время по игровым минутам от начала дела. */
export function gameDate(minutes: number): Date {
  return new Date(CASE_START.getTime() + minutes * 60_000);
}

/** «Понедельник, 25 ноября» */
export function dayLabel(d: Date): string {
  const w = WEEKDAYS[d.getDay()];
  return `${w[0].toUpperCase()}${w.slice(1)}, ${d.getDate()} ${MONTHS_GEN[d.getMonth()]}`;
}

/** «09:40» */
export function clockLabel(d: Date): string {
  return `${String(d.getHours()).padStart(2, "0")}:${String(d.getMinutes()).padStart(2, "0")}`;
}
