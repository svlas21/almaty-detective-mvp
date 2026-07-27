import { createClient } from "@supabase/supabase-js";

/**
 * Клиентский Supabase-клиент (anon key). Используется в браузере только
 * для логина/регистрации игрока. Игровые данные (locations, characters,
 * evidence и т.д.) через этот клиент НЕ запрашиваются — только через
 * серверные API-роуты (см. lib/supabaseAdmin.ts), чтобы контролировать
 * постепенное раскрытие карты.
 */
export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);
