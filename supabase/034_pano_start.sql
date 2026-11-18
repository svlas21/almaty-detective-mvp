-- Начальный ракурс полной панорамы (градусы): открываем на главное в кадре
alter table locations add column if not exists pano_yaw real;
alter table locations add column if not exists pano_pitch real;
update locations set pano_yaw = 45, pano_pitch = -8 where id = '29196055-161c-5b4e-a38f-352cbf3e5032';  -- дача: гараж
update locations set pano_yaw = 5, pano_pitch = -5 where id = 'ee497c59-0b63-50e6-91fc-8c67893c99ed';   -- общежитие: окно и койка Олжаса
notify pgrst, 'reload schema';
select name, pano_yaw, pano_pitch from locations where pano_yaw is not null;
