-- ============================================================
-- Дело №9704: механика живых входящих звонков во время партии (полноэкранный
-- оверлей, игрок только слушает и жмёт "Ответить"). Не путать со "Звонок
-- Марата" — это отдельная, не связанная улика из цепочки Ежедневник →
-- реакция Виктора/Данияра → улика → реакция Рината (см. present/route.ts),
-- та цепочка не трогается и продолжает работать как раньше.
-- Выполните этот файл в Supabase SQL Editor.
-- ============================================================

create table if not exists phone_calls (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  caller_character_id uuid not null references characters(id),
  caller_role text,
  order_index int not null default 0,
  -- Символьный ключ условия открытия звонка. Не универсальный движок условий —
  -- как и остальные unlock-и в проекте (apartmentUnlockCondition и т.п.),
  -- реальная проверка условия хардкодится в state/route.ts по этому ключу.
  unlock_condition_key text not null,
  dialogue_text text not null,
  unlocks_location_id uuid references locations(id),
  grants_evidence_id uuid references evidence(id),
  created_at timestamptz not null default now()
);

-- Какие звонки игрок уже принял ("Ответить" нажата) — по аналогии с
-- viewed_reactions/viewed_characters. Отдельно от самого факта показа
-- оверлея: пока звонок не в этом массиве, state/route.ts продолжит
-- отдавать его как pendingCall при каждом запросе.
alter table session_state
  add column if not exists viewed_calls uuid[] not null default '{}';
