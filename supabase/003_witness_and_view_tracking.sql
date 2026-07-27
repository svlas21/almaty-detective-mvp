-- ============================================================
-- Дело №9704: свидетели без предъявления улик + трекинг "карточка открыта".
-- Выполните этот файл в Supabase SQL Editor.
-- ============================================================

-- Отличает подозреваемого (можно предъявлять улики, есть confession)
-- от свидетеля (только протокол допроса, без "Предъявить улику").
-- default true — ни один существующий персонаж не меняет поведение.
alter table characters
  add column if not exists is_suspect boolean not null default true;

-- Какие персонажи хотя бы раз были открыты игроком в UI (SuspectDetail) —
-- в отличие от discovered_characters, который фиксирует лишь "встречен
-- по локации" (см. app/api/games/[sessionId]/travel/route.ts).
alter table session_state
  add column if not exists viewed_characters uuid[] not null default '{}';
