-- Дело 9704 v2: нейтральные подписи улик в осмотре + предметы дачи «есть, но не улика». Прогресс не трогает.
begin;
alter table case_decoy_categories add column if not exists location_id uuid references locations(id) on delete cascade;
alter table case_decoy_categories add column if not exists found_text text;
update evidence set generic_category = 'Пейджер' where case_id = '029e23c3-01e0-5d19-a0e7-3e0c2446ebab' and name = 'Пейджер в арыке у ворот' and location_id is not null;
update evidence set generic_category = 'Следы у гаража' where case_id = '029e23c3-01e0-5d19-a0e7-3e0c2446ebab' and name = 'Гараж дачи: следы в слякоти, борозды, фототаблица РОВД' and location_id is not null;
update evidence set generic_category = 'Телефон с АОН' where case_id = '029e23c3-01e0-5d19-a0e7-3e0c2446ebab' and name = 'Китайский АОН у телефона Валентины и блокнот' and location_id is not null;
update evidence set generic_category = 'Конверт' where case_id = '029e23c3-01e0-5d19-a0e7-3e0c2446ebab' and name = 'Конверт «на похороны» с пятью стодолларовыми купюрами' and location_id is not null;
update evidence set generic_category = 'Журнал КПП' where case_id = '029e23c3-01e0-5d19-a0e7-3e0c2446ebab' and name = 'Журнал КПП базы: «Мамаджанов Ф., 16:10–16:40»' and location_id is not null;
update evidence set generic_category = 'Пейджер охранника' where case_id = '029e23c3-01e0-5d19-a0e7-3e0c2446ebab' and name = 'Пейджер охранного агентства на поясе Ерлана' and location_id is not null;
update evidence set generic_category = 'Подвал' where case_id = '029e23c3-01e0-5d19-a0e7-3e0c2446ebab' and name = 'Подвал Шмидтов: матрас, верёвки, шарф, люк, лампа, окурки' and location_id is not null;
update evidence set generic_category = 'Спортивная куртка' where case_id = '029e23c3-01e0-5d19-a0e7-3e0c2446ebab' and name = 'Вещи Олжаса: $3000 в куртке, куртка, ушанка, ботинки 45 размера' and location_id is not null;
update evidence set generic_category = 'Журнал вахтёрши' where case_id = '029e23c3-01e0-5d19-a0e7-3e0c2446ebab' and name = 'Журнал вахтёрши: Бекенов в субботу с 19:30 до утра в общежитии' and location_id is not null;
update evidence set generic_category = 'Зимние ботинки' where case_id = '029e23c3-01e0-5d19-a0e7-3e0c2446ebab' and name = 'Зимние ботинки 43 размера с порезом на каблуке' and location_id is not null;
update evidence set generic_category = 'Мешок с рисом' where case_id = '029e23c3-01e0-5d19-a0e7-3e0c2446ebab' and name = 'Тайник в мешке с рисом: доллары и расписки; доверенность Шмидтов в папке на полке' and location_id is not null;
update evidence set generic_category = 'Расписка' where case_id = '029e23c3-01e0-5d19-a0e7-3e0c2446ebab' and name = 'Расписка кредитора на бланке купонного инвестиционного фонда' and location_id is not null;
delete from case_decoy_categories where case_id = '029e23c3-01e0-5d19-a0e7-3e0c2446ebab' and label in ('Пустая бутылка','Детская варежка','Сломанный зонт') and location_id is null;
delete from case_decoy_categories where case_id = '029e23c3-01e0-5d19-a0e7-3e0c2446ebab' and location_id = '29196055-161c-5b4e-a38f-352cbf3e5032';
insert into case_decoy_categories (case_id, label, location_id, found_text) values ('029e23c3-01e0-5d19-a0e7-3e0c2446ebab', 'Пустая бутылка', '29196055-161c-5b4e-a38f-352cbf3e5032', 'Бутылка из-под «Жигулёвского» под яблоней. Этикетка размокла, внутри прелые листья. Лежит тут с осени.

К делу не относится.');
insert into case_decoy_categories (case_id, label, location_id, found_text) values ('029e23c3-01e0-5d19-a0e7-3e0c2446ebab', 'Детская варежка', '29196055-161c-5b4e-a38f-352cbf3e5032', 'Красная вязаная варежка на штакетнике. Детская. Кто-то нашёл и надел на штакетину, чтобы хозяин заметил. С прошлой зимы висит.

К делу не относится.');
insert into case_decoy_categories (case_id, label, location_id, found_text) values ('029e23c3-01e0-5d19-a0e7-3e0c2446ebab', 'Сломанный зонт', '29196055-161c-5b4e-a38f-352cbf3e5032', 'Чёрный складной зонт у крыльца. Спицы вывернуты ветром. Бросили и забыли.

К делу не относится.');
insert into case_decoy_categories (case_id, label, location_id, found_text) values ('029e23c3-01e0-5d19-a0e7-3e0c2446ebab', 'Детский велосипед', '29196055-161c-5b4e-a38f-352cbf3e5032', 'Детский велосипед под клеёнкой. Цепь в ржавчине, шины спущены. С лета не трогали.

К делу не относится.');
insert into case_decoy_categories (case_id, label, location_id, found_text) values ('029e23c3-01e0-5d19-a0e7-3e0c2446ebab', 'Мешок угля', '29196055-161c-5b4e-a38f-352cbf3e5032', 'Мешок угольных брикетов на крыльце, початый. А котёл холодный, зола старая: в эти выходные дом не топили.');
insert into case_decoy_categories (case_id, label, location_id, found_text) values ('029e23c3-01e0-5d19-a0e7-3e0c2446ebab', 'Калитка', '29196055-161c-5b4e-a38f-352cbf3e5032', 'Узкая калитка рядом с воротами. Щеколда задвинута. На щеколде паутина, в ней сухие листья. Через калитку давно никто не ходил.');
commit;
select generic_category from evidence where case_id = '029e23c3-01e0-5d19-a0e7-3e0c2446ebab' and generic_category is not null union all select label || ' [дача]' from case_decoy_categories where location_id = '29196055-161c-5b4e-a38f-352cbf3e5032';
