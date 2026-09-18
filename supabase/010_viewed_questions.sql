-- ============================================================
-- Дело №9704: фикс — тема "Ерлан Подгорный" открывалась у Алии сразу с
-- первым заходом в её карточку допроса (условие topics.unlock_character_id
-- проверяло только session_state.viewed_characters — "карточка открыта
-- хоть раз"), а не после того, как игрок реально раскрыл именно вопрос
-- "У него вообще были враги?", где она называет Ерлана.
--
-- В базе не было вообще никакого трекинга "какой конкретно вопрос
-- протокола допроса уже просмотрен" — InterrogationProtocol.tsx хранит
-- это только в локальном React-стейте, session_state ничего не знает.
--
-- session_state.viewed_questions — тот же паттерн ключей, что уже
-- используется в viewed_reactions: "characterId:questionIndex".
--
-- topics.unlock_question_character_id + unlock_question_index — новая
-- пара условий открытия темы (по аналогии с unlock_reaction_character_id
-- + unlock_reaction_evidence_id из 008_topic_unlock_conditions.sql), оба
-- поля задаются только вместе.
-- Выполните этот файл в Supabase SQL Editor.
-- ============================================================

alter table session_state
  add column if not exists viewed_questions text[] not null default '{}';

alter table topics
  add column if not exists unlock_question_character_id uuid references characters(id),
  add column if not exists unlock_question_index integer;
