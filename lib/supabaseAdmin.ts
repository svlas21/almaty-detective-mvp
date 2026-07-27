import { createClient } from "@supabase/supabase-js";

/**
 * Серверный клиент с service role key.
 * ИСПОЛЬЗУЕТСЯ ТОЛЬКО в app/api/** (серверный код), никогда в клиентских компонентах —
 * этот ключ обходит Row Level Security и имеет полный доступ к БД.
 *
 * Именно через этот клиент реализована логика "сервер — единственный источник правды":
 * elapsed_minutes, discovered_*, score считаются и хранятся только здесь.
 */
export function supabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error(
      "Не заданы NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY — заполните .env.local"
    );
  }

  return createClient(url, serviceKey, {
    auth: { persistSession: false },
    // Next.js патчит глобальный fetch в Route Handlers и по умолчанию кэширует
    // запросы supabase-js в Data Cache — без этого свежие данные из БД
    // могут годами отдаваться из .next/cache/fetch-cache.
    global: { fetch: (input, init) => fetch(input, { ...init, cache: "no-store" }) },
  });
}
