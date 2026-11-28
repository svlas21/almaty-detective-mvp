-- Старая версия дела: квартира «Марата» — частичная панорама 180° и предметы «есть, но не улика»
begin;
update locations set image_url = 'https://zhdvfvrqgunjickiaoqi.supabase.co/storage/v1/object/public/location-images/loc3-marat-wide.jpg', pano_haov = 180 where id = '93b5c0ed-cbab-43b3-8b7e-86af78191fd0';
delete from case_decoy_categories where location_id = '93b5c0ed-cbab-43b3-8b7e-86af78191fd0';
insert into case_decoy_categories (case_id, label, location_id, found_text) values ('c87a520b-a339-4dfc-a6ab-66620ba7f1a8', 'Пепельницы и зажигалки', '93b5c0ed-cbab-43b3-8b7e-86af78191fd0', 'Стеклянная пепельница на столе, придавливает бумаги. Пустая, вытряхнута. К делу не относится.');
insert into case_decoy_categories (case_id, label, location_id, found_text) values ('c87a520b-a339-4dfc-a6ab-66620ba7f1a8', 'Кухонная утварь', '93b5c0ed-cbab-43b3-8b7e-86af78191fd0', 'Электроплитка на одну конфорку и раковина с подтёками. Чайника нет, кастрюли нет. К делу не относится.');
insert into case_decoy_categories (case_id, label, location_id, found_text) values ('c87a520b-a339-4dfc-a6ab-66620ba7f1a8', 'Мебель', '93b5c0ed-cbab-43b3-8b7e-86af78191fd0', 'Железная кровать с голым матрасом, перевёрнутый табурет, старый платяной шкаф. Всё казённое, хозяйское.');
insert into case_decoy_categories (case_id, label, location_id, found_text) values ('c87a520b-a339-4dfc-a6ab-66620ba7f1a8', 'Окна', '93b5c0ed-cbab-43b3-8b7e-86af78191fd0', 'Два узких окна под потолком, на уровне тротуара. Видны только ноги прохожих. К делу не относится.');
insert into case_decoy_categories (case_id, label, location_id, found_text) values ('c87a520b-a339-4dfc-a6ab-66620ba7f1a8', 'Двери', '93b5c0ed-cbab-43b3-8b7e-86af78191fd0', 'Входная дверь, обитая дерматином. Замок цел, следов взлома нет.');
insert into case_decoy_categories (case_id, label, location_id, found_text) values ('c87a520b-a339-4dfc-a6ab-66620ba7f1a8', 'Батарея', '93b5c0ed-cbab-43b3-8b7e-86af78191fd0', 'Чугунная батарея под окном, еле тёплая. К делу не относится.');
commit;
select (select count(*) from case_decoy_categories where location_id = '93b5c0ed-cbab-43b3-8b7e-86af78191fd0') decoys, (select pano_haov from locations where id = '93b5c0ed-cbab-43b3-8b7e-86af78191fd0') haov;
