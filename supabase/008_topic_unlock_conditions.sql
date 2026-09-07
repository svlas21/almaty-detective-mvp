-- ============================================================
-- Дело №9704: расширение условий открытия тем "Спросить про..." — до сих
-- пор topics.unlock_evidence_id умел только "эта улика в collected_evidence"
-- (см. ask/route.ts, state/route.ts). Часть тем на самом деле открывается
-- появлением персонажа/локации в сюжете, а не уликой — добавляем три новых,
-- равноправных с unlock_evidence_id условия:
--   unlock_character_id         — персонаж уже допрошен (viewed_characters)
--   unlock_location_id          — локация уже открыта (discovered_locations)
--   unlock_reaction_character_id +
--   unlock_reaction_evidence_id — пара "этому персонажу предъявили эту
--                                  улику и увидели реакцию" (viewed_reactions,
--                                  формат ключа "characterId:evidenceId" —
--                                  тот же, что уже используют present/route.ts
--                                  и case_accusation.accomplices). Оба поля
--                                  пары задаются только вместе, порознь не
--                                  имеют смысла.
-- У темы может быть выставлено 0 или 1 условие (любого типа/пары) —
-- комбинирование условий не предусмотрено.
-- Выполните этот файл в Supabase SQL Editor.
-- ============================================================

alter table topics
  add column if not exists unlock_character_id uuid references characters(id),
  add column if not exists unlock_location_id uuid references locations(id),
  add column if not exists unlock_reaction_character_id uuid references characters(id),
  add column if not exists unlock_reaction_evidence_id uuid references evidence(id);
