-- ============================================================
-- Дело №9704: секция "Спросить про..." на экране допроса — темы,
-- открывающиеся по улике, с авторскими репликами по персонажам и
-- шаблонным фоллбэком для непокрытых данными (см. topic_answers ниже).
-- Выполните этот файл в Supabase SQL Editor.
-- ============================================================

create table if not exists topics (
  id uuid primary key default gen_random_uuid(),
  case_id uuid not null references cases(id) on delete cascade,
  key text not null,
  label text not null,
  -- null = тема доступна сразу; иначе открывается, когда эта улика в collected_evidence.
  unlock_evidence_id uuid references evidence(id),
  -- Имя эксперта для шаблона "эксперт вне области — обратитесь к X" (см. ask/route.ts).
  -- Пусто = у темы нет профильного эксперта, фоллбэк для экспертов без авторской
  -- реплики звучит без адресации ("Это не по моей части.").
  expert_redirect_name text,
  order_index int not null default 0,
  created_at timestamptz not null default now()
);

-- Авторские ответы персонажей по темам, ключ jsonb = id темы. Форма записи:
-- {
--   "competence": "in" | "out",
--   "text": string,                 -- основной ответ (или ответ ПОСЛЕ condition_evidence_id)
--   "pre_condition_text"?: string,  -- ответ ДО condition_evidence_id, если задан
--   "condition_evidence_id"?: string,
--   "grants_evidence_id"?: string   -- улика, выдаваемая этим ответом (см. Данияр/тема Фархада)
-- }
-- Персонажи без записи по теме получают шаблонный фоллбэк в коде — тот же
-- принцип, что у reactions/fixed_questions (jsonb-блоб per-character, без
-- отдельной join-таблицы под один сценарий, см. 004_viewed_reactions.sql).
alter table characters
  add column if not exists topic_answers jsonb not null default '{}';
