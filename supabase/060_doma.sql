-- 060. «Дома» (в значении «у себя») голос читает «дома́» (25.11, на слух, Данияр q1). Заменено на «у себя» / «в квартире».
-- Меняется только текст, audio_url сохраняются.
begin;
update characters set fixed_questions = replace(fixed_questions::text, '— Дома. Один.', '— У себя. Один.')::jsonb where id = 'a7955352-673d-5ff7-bfcc-506079544d1f';
update characters set reaction_rules = replace(reaction_rules::text, 'Я был не дома.', 'Я был не у себя.')::jsonb where id = 'a7955352-673d-5ff7-bfcc-506079544d1f';
update characters set fixed_questions = replace(fixed_questions::text, 'Дома, в «Орбите».', 'У себя, в «Орбите».')::jsonb where id = '5b4c1ece-ba00-50d6-9113-73e03e05ccd8';
update characters set reaction_rules = replace(reaction_rules::text, 'про свечку дома перепутал', 'про свечку у себя перепутал')::jsonb where id = '5b4c1ece-ba00-50d6-9113-73e03e05ccd8';
update characters set reaction_rules = replace(reaction_rules::text, 'Дома, значит.', 'У себя, значит.')::jsonb where id = 'ea6167fb-4eea-5e08-ae65-e5fce24e6a6c';
update characters set reaction_rules = replace(reaction_rules::text, 'Наверно, дома.', 'Наверно, у себя.')::jsonb where id = 'ea6167fb-4eea-5e08-ae65-e5fce24e6a6c';
update characters set reaction_rules = replace(reaction_rules::text, 'Не дома он был.', 'Не у себя он был.')::jsonb where id = 'ea6167fb-4eea-5e08-ae65-e5fce24e6a6c';
update characters set reaction_rules = replace(reaction_rules::text, 'Дома?', 'В квартире?')::jsonb where id = '631694f6-0ec1-523d-9f2a-599f875223c1';
update characters set reaction_rules = replace(reaction_rules::text, 'Только не у него дома.', 'Только не у него в квартире.')::jsonb where id = '631694f6-0ec1-523d-9f2a-599f875223c1';
update characters set reaction_rules = replace(reaction_rules::text, 'по четвергам дома сидел', 'по четвергам у себя сидел')::jsonb where id = '96e916c8-7fd0-5edc-a4fe-1a6aeda231bf';
update characters set reaction_rules = replace(reaction_rules::text, 'что сидел дома.', 'что сидел у себя.')::jsonb where id = '14e9bc6d-22f0-5005-b51c-e0678d8fa225';
update characters set fallback_lines = replace(fallback_lines::text, 'машины, дома —', 'машины, квартиры —')::jsonb where id = '14e9bc6d-22f0-5005-b51c-e0678d8fa225';
commit;
