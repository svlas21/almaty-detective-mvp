-- 065. Названия улик без путаницы + конкретный отказ прокурора (когда все нужные улики уже в папке)
begin;
update evidence set name = 'Следы у гаража: 43-й размер, порез на каблуке' where id = '60950128-af31-513e-b8de-bb87b02332cc';
update evidence set name = 'Ботинки Фархада совпали со следами у гаража' where id = '6fc41a46-a0eb-5890-9b26-3b19bcef490d';
update evidence set name = 'Обувь Ахметова, Нуртазина и Жумабаевой не совпала' where id = '7a9bdd9a-4323-5342-a3bd-24301a6d6e88';
alter table case_accusation add column if not exists required_hints jsonb;
update case_accusation set required_hints = '{"54bf13bc-3525-5eec-9441-609d8ee21f59": "не доказано, что это убийство. По бумагам он до сих пор «угорел».", "27ae146a-a05c-5e7a-84a1-899c35e883e4": "не доказано, что обвиняемый был там, где держали Игоря.", "6fc41a46-a0eb-5890-9b26-3b19bcef490d": "не доказано, что обвиняемый был у гаража в ночь инсценировки."}'::jsonb where case_id = '029e23c3-01e0-5d19-a0e7-3e0c2446ebab';
commit;
notify pgrst, 'reload schema';
select id, name from evidence where id in ('60950128-af31-513e-b8de-bb87b02332cc','6fc41a46-a0eb-5890-9b26-3b19bcef490d','7a9bdd9a-4323-5342-a3bd-24301a6d6e88');
