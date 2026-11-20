/**
 * Короткий кэш неизменяемых данных дела в памяти сервера.
 * Состояние партии (session_state) не кэшируется никогда — только то,
 * что одинаково для всех запросов: локации, персонажи, темы, обманки и т. п.
 * TTL короткий, чтобы правки в базе (новая панорама, текст) доходили до
 * игры максимум за полминуты без перезапуска сервера.
 */
const TTL_MS = 30_000;
const store = new Map<string, { at: number; value: Promise<unknown> }>();

export function cached<T>(key: string, load: () => Promise<T>): Promise<T> {
  const hit = store.get(key);
  if (hit && Date.now() - hit.at < TTL_MS) return hit.value as Promise<T>;
  const value = load().catch((e) => {
    store.delete(key); // ошибку не кэшируем
    throw e;
  });
  store.set(key, { at: Date.now(), value });
  return value;
}
