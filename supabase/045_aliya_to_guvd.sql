-- 045. Алия переезжает с дачи в ГУВД: вызвана повесткой для объяснения.
-- Причина: она врёт, что «с лета не была на даче». Если игрок застаёт её прямо на даче,
-- ложь ломается сама, без работы следователя. Решение автора от 24.11.2026.
-- Показывается, как и раньше, только после заключения СМЭ или пейджера (unlock_evidence_ids не трогаем).

-- 1. Место и вступление
update characters
set location_id = '006a31f4-baeb-5b53-9a87-6a397ba18362',
    intro_text = 'Алия Жумабаева, 37 лет, бывшая жена. Анестезиолог городской больницы. Зарплату задерживают третий месяц.
Сидит в коридоре у кабинета. Пуховик поверх белого халата: отпросилась с работы. В руке повестка.
— Участковый в семь утра в дверь звонил. Повестку принёс, будто я преступница. Ну, спрашивайте, что хотели.'
where id = '96e916c8-7fd0-5edc-a4fe-1a6aeda231bf';

-- 2. Ответ про дачу: «тут» → «там» (теперь она не на даче). Остальное в вопросах не трогаем.
update characters
set fixed_questions = replace(fixed_questions::text, 'Что мне тут делать?', 'Что мне там делать?')::jsonb
where id = '96e916c8-7fd0-5edc-a4fe-1a6aeda231bf';

-- 3. Шеф: новый вопрос «А бывшая жена?». Дописываем в конец, озвученные ответы (audio_url) не трогаем.
update characters
set fixed_questions = fixed_questions || '[{"q": "А бывшая жена?", "a": "— Я её повесткой вызвал. Дача у них спорная, ключи у неё. Как придёт, поговори с ней."}]'::jsonb
where id = '57949d2d-0b2d-5c04-812c-5849e9441857'
  and not fixed_questions @> '[{"q": "А бывшая жена?"}]'::jsonb;

-- 4. Старые игры: кто уже был в ГУВД, увидит её при следующем заезде туда (travel добавляет людей локации).

select
  (select l.name from characters c join locations l on l.id = c.location_id where c.id = '96e916c8-7fd0-5edc-a4fe-1a6aeda231bf') as aliya_location,
  (select position('Что мне там делать?' in fixed_questions::text) > 0 from characters where id = '96e916c8-7fd0-5edc-a4fe-1a6aeda231bf') as answer_fixed,
  (select jsonb_array_length(fixed_questions) from characters where id = '57949d2d-0b2d-5c04-812c-5849e9441857') as chief_questions;
