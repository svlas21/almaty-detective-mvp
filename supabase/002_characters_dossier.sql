-- ============================================================
-- Досье подозреваемых: экран "Подозреваемые" + допрос.
-- Выполните этот файл в Supabase SQL Editor.
-- На момент написания в живой БД в characters ещё нет этих колонок —
-- schema.sql уже отстаёт от факта (там же нет map_pos_x/preview_image_url/
-- short_description у locations), это по тому же паттерну.
-- ============================================================

alter table characters
  add column if not exists role text,
  add column if not exists intro_text text,
  add column if not exists fixed_questions jsonb not null default '[]'::jsonb,       -- [{ "q": "...", "a": "..." }, ...]
  add column if not exists reactions jsonb not null default '{}'::jsonb,             -- { "<evidence_id>": "текст реакции", ... }
  add column if not exists confession_text text,
  add column if not exists confession_requires_evidence uuid[];                      -- null = у персонажа нет отдельного признания
