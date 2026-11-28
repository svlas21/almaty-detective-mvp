-- 058. Озвучка общих ответов («Мне сказать нечего», «Я всё сказал», «Это не по моей части»):
-- characters.generic_audio = {точный текст реплики → ссылка на mp3}, голосом этого персонажа.
-- Плюс повторные фразы групп без «уже» (голос читает «уже» неустойчиво).
begin;
alter table characters add column if not exists generic_audio jsonb not null default '{}'::jsonb;
update characters c set reaction_rules = (
  select jsonb_agg(case when r ? 'repeat_text'
    then jsonb_set(r, '{repeat_text}', to_jsonb(replace(replace(r->>'repeat_text', 'Я уже всё сказал', 'Я всё сказал'), 'Я вам уже всё рассказала', 'Я вам всё рассказала')))
    else r end)
  from jsonb_array_elements(c.reaction_rules) r)
where c.case_id = '029e23c3-01e0-5d19-a0e7-3e0c2446ebab' and jsonb_typeof(c.reaction_rules) = 'array' and jsonb_array_length(c.reaction_rules) > 0;
commit;
notify pgrst, 'reload schema';
select count(*) filter (where reaction_rules::text like '%уже всё сказал%') as left_uzhe from characters where case_id = '029e23c3-01e0-5d19-a0e7-3e0c2446ebab';
