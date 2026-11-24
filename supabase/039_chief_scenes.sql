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

«Читал Кана. Значит, не угар.
Звонил начальник Медеуского РОВД. Обиделся: забираем у них чистый материал. Звонил генералу. Генерал спросил меня, зачем. Я сказал: задушили. Генерал сказал: тогда быстро.
Мать звонила. Спрашивала, когда можно забрать Игоря. Я не знал, что ей ответить.
Неделя — это пять рабочих дней. Считай сам».');
insert into phone_calls (id, case_id, caller_character_id, caller_name, caller_role, style, order_index, unlock_condition_key, dialogue_text) values ('470eea08-4225-536c-aca7-5c7f7ac1db01', '029e23c3-01e0-5d19-a0e7-3e0c2446ebab', null, 'Начальник следственного отдела', 'Коридор ГУВД, у курилки', 'scene', 2, 'any:0146fe89-1029-5d65-87bb-f750dfe7ad2d', 'Начальник отдела докуривает у окна в конце коридора. На вас не смотрит.
— Бекенов. Деньги из выкупа, в похищении признался сам. Прокурор доволен. Говорит: пишите на него, остальное суд разберёт.
(пауза)
— Из министерства звонили. Не про Бекенова. Про то, почему у меня бизнесмена до сих пор не похоронили.
(тушит окурок о подоконник)
— Красиво, да. Я бы и сам подписал. Только меня спросят одно: кто его задушил. И я должен буду ответить. Ты мне скажи — он? Если он, докажи. Если не он — скажи сейчас. Не в пятницу.');
insert into phone_calls (id, case_id, caller_character_id, caller_name, caller_role, style, order_index, unlock_condition_key, dialogue_text) values ('a9349cc1-fa86-51b9-9a9b-009f15f0cbde', '029e23c3-01e0-5d19-a0e7-3e0c2446ebab', null, 'Начальник следственного отдела', 'Внутренний телефон', 'scene', 3, 'any:00b31a8e-e1ee-5474-a323-177b43b153d3|2d1a03f4-be7f-5007-8fe1-71c12d498c29', 'Звонит внутренний. Трубка тяжёлая, с трещиной на корпусе.
— Мамаджанов задержан. Семьдесят два часа. Дальше либо арест, либо отпускаем.
(прикрывает трубку ладонью, говорит кому-то в сторону)
— Да. Понял. Да.
— Прокуратура хочет обвинение до того, как его похоронят. Я сказал: будет.
(пауза)
— Он спокойный, говорят. Чай попросил. Такие спокойные сами ничего не подписывают. Не подведи меня. И себя.
Короткие гудки.');
commit;
notify pgrst, 'reload schema';
select caller_role, unlock_condition_key from phone_calls where case_id = '029e23c3-01e0-5d19-a0e7-3e0c2446ebab' order by order_index;
