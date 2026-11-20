-- Дело 9704 v2: ещё 12 обманок «здесь такого нет» (облако осмотра ~27 карточек). Повторный запуск безопасен.
insert into case_decoy_categories (case_id, label)
select v.case_id::uuid, v.label from (values
('029e23c3-01e0-5d19-a0e7-3e0c2446ebab', 'Пуговица'),
('029e23c3-01e0-5d19-a0e7-3e0c2446ebab', 'Спичечный коробок'),
('029e23c3-01e0-5d19-a0e7-3e0c2446ebab', 'Зажигалка'),
('029e23c3-01e0-5d19-a0e7-3e0c2446ebab', 'Мужская перчатка'),
('029e23c3-01e0-5d19-a0e7-3e0c2446ebab', 'Аудиокассета'),
('029e23c3-01e0-5d19-a0e7-3e0c2446ebab', 'Автобусный билет'),
('029e23c3-01e0-5d19-a0e7-3e0c2446ebab', 'Талон на бензин'),
('029e23c3-01e0-5d19-a0e7-3e0c2446ebab', 'Визитка'),
('029e23c3-01e0-5d19-a0e7-3e0c2446ebab', 'Фотография'),
('029e23c3-01e0-5d19-a0e7-3e0c2446ebab', 'Квитанция ломбарда'),
('029e23c3-01e0-5d19-a0e7-3e0c2446ebab', 'Губная помада'),
('029e23c3-01e0-5d19-a0e7-3e0c2446ebab', 'Гильза')
) as v(case_id, label)
where not exists (select 1 from case_decoy_categories d where d.case_id = v.case_id::uuid and d.label = v.label and d.location_id is null);
