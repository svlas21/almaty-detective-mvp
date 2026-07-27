-- ============================================================
-- Схема БД MVP детективной игры (см. Техдизайн-документ, разд. 3)
-- Выполните этот файл в Supabase SQL Editor.
-- Контент (дела, персонажи, улики, диалоги) отделён от кода —
-- новое дело добавляется строками в этих таблицах, без правок кода.
-- ============================================================

-- Каталог дел
create table cases (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  price integer not null,                 -- цена в тенге
  intro_text text not null,
  start_location_id uuid,                 -- FK на locations, добавляется после создания стартовой локации
  is_published boolean not null default false,
  created_at timestamptz not null default now()
);

-- Районы/локации внутри дела
create table locations (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  name text not null,
  image_url text,
  reveal_trigger_id uuid,                 -- id dialogue_response, который открывает эту локацию (null = открыта с начала)
  created_at timestamptz not null default now()
);

alter table cases
  add constraint fk_cases_start_location
  foreign key (start_location_id) references locations(id);

-- Персонажи
create table characters (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  location_id uuid references locations(id),
  name text not null,
  portrait_url text,
  is_expert boolean not null default false,   -- true = эксперт-консультант, доступен из любой локации
  created_at timestamptz not null default now()
);

-- Улики и особые предметы
create table evidence (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  name text not null,
  image_url text,
  description text,
  created_at timestamptz not null default now()
);

-- Темы допроса: клик по улике/персонажу во время разговора
create table dialogue_topics (
  id uuid primary key default gen_random_uuid(),
  character_id uuid not null references characters(id) on delete cascade,
  topic_type text not null check (topic_type in ('evidence', 'character')),
  topic_ref_id uuid not null,              -- id улики или персонажа, о котором спрашивают
  created_at timestamptz not null default now()
);

-- Ответ персонажа на тему допроса
create table dialogue_responses (
  id uuid primary key default gen_random_uuid(),
  topic_id uuid not null references dialogue_topics(id) on delete cascade,
  response_text text not null,
  reveals jsonb not null default '{"locations": [], "characters": [], "evidence": []}'::jsonb,
  created_at timestamptz not null default now()
);

-- Финальные вопросы "докажи вывод"
create table accusation_questions (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  question_text text not null,
  required_evidence_ids uuid[] not null,   -- какие id улик/показаний нужно предъявить для правильного ответа
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

-- Игроки (в MVP можно первое время полагаться на supabase auth.users,
-- эта таблица — на случай, если понадобятся доп. поля профиля)
create table profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  email text not null,
  created_at timestamptz not null default now()
);

-- Купленные билеты (ваучеры на одно дело)
create table purchases (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  case_id uuid not null references cases(id),
  status text not null default 'pending' check (status in ('pending', 'paid', 'refunded')),
  amount integer not null,
  payment_provider_ref text,               -- id транзакции от Kaspi/эквайринга
  created_at timestamptz not null default now(),
  paid_at timestamptz
);

-- Игровая партия
create table game_sessions (
  id uuid primary key default gen_random_uuid(),
  purchase_id uuid not null references purchases(id),
  current_location_id uuid references locations(id),
  elapsed_minutes integer not null default 0,
  status text not null default 'in_progress' check (status in ('in_progress', 'finished')),
  score integer,
  started_at timestamptz not null default now(),
  finished_at timestamptz
);

-- Что уже открыто/собрано в конкретной партии
create table session_state (
  session_id uuid primary key references game_sessions(id) on delete cascade,
  discovered_locations uuid[] not null default '{}',
  discovered_characters uuid[] not null default '{}',
  discovered_evidence uuid[] not null default '{}',
  collected_evidence uuid[] not null default '{}',   -- улики/показания, которыми можно "доказывать" на финале
  updated_at timestamptz not null default now()
);

-- ============================================================
-- Индексы для частых запросов
-- ============================================================
create index idx_locations_case on locations(case_id);
create index idx_characters_case on characters(case_id);
create index idx_evidence_case on evidence(case_id);
create index idx_dialogue_topics_character on dialogue_topics(character_id);
create index idx_dialogue_responses_topic on dialogue_responses(topic_id);
create index idx_purchases_user on purchases(user_id);
create index idx_game_sessions_purchase on game_sessions(purchase_id);

-- ============================================================
-- RLS (Row Level Security) — базовые политики
-- Игроки видят только свои purchases/sessions.
-- Контент дел (cases/locations/characters/...) публично читаем ТОЛЬКО через
-- server-side (service role), чтобы не отдавать клиенту неоткрытые данные
-- напрямую из таблиц — вся выдача идёт через API-роуты (см. app/api).
-- ============================================================
alter table purchases enable row level security;
alter table game_sessions enable row level security;
alter table session_state enable row level security;

create policy "users see own purchases"
  on purchases for select
  using (auth.uid() = user_id);

create policy "users see own sessions"
  on game_sessions for select
  using (
    purchase_id in (select id from purchases where user_id = auth.uid())
  );

create policy "users see own session state"
  on session_state for select
  using (
    session_id in (
      select gs.id from game_sessions gs
      join purchases p on p.id = gs.purchase_id
      where p.user_id = auth.uid()
    )
  );

-- Контентные таблицы (cases, locations, characters, evidence, dialogue_*,
-- accusation_questions) сознательно БЕЗ публичных select-политик для anon-роли —
-- их читает только сервер через service role в API-роутах. Это и есть механизм
-- "постепенного раскрытия карты" (см. Техдок, разд. 5): клиент никогда не видит
-- то, что ещё не discovered.
