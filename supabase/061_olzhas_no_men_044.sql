-- 061. Олжас: «Мен не …» → «Я не …» в реакциях на показания из 044 (R306, R312, R316, R319)
-- и везде, где осталось. Повторный запуск безопасен.
begin;
update characters
set reaction_rules = replace(reaction_rules::text, 'Мен не', 'Я не')::jsonb,
    fixed_questions = replace(fixed_questions::text, 'Мен не', 'Я не')::jsonb,
    intro_text = replace(intro_text, 'Мен не', 'Я не')
where id = 'ea6167fb-4eea-5e08-ae65-e5fce24e6a6c';
commit;
select count(*) as left_men from characters where id = 'ea6167fb-4eea-5e08-ae65-e5fce24e6a6c' and reaction_rules::text like '%Мен не%';
