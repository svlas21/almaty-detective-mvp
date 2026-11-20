-- 039: сцены начальства (дело 9704 v2) — три «звонка» шефа: записка, коридор, внутренний.
-- Звонок может быть без персонажа (caller_name), стиль "scene" — лист из дела вместо трубки.
-- Условие: unlock_condition_key = 'any:<evidence uuid>|…' или 'evidence:<uuid>,…' (state/route.ts).
begin;
alter table phone_calls alter column caller_character_id drop not null;
alter table phone_calls add column if not exists caller_name text;
alter table phone_calls add column if not exists style text not null default 'mobile';
delete from phone_calls where case_id = '029e23c3-01e0-5d19-a0e7-3e0c2446ebab';
-- 6b. Сцены начальства
insert into phone_calls (id, case_id, caller_character_id, caller_name, caller_role, style, order_index, unlock_condition_key, dialogue_text) values ('6879697e-dfaf-523c-8a4f-a809dea63c0a', '029e23c3-01e0-5d19-a0e7-3e0c2446ebab', null, 'Начальник следственного отдела', 'Записка на столе', 'scene', 1, 'any:54bf13bc-3525-5eec-9441-609d8ee21f59', 'На вашем столе, поверх отказного материала, листок из перекидного календаря. Синий карандаш, почерк начальника отдела:
commit;
notify pgrst, 'reload schema';
select caller_role, unlock_condition_key from phone_calls where case_id = '029e23c3-01e0-5d19-a0e7-3e0c2446ebab' order by order_index;
