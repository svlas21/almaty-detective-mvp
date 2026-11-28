-- Снимок улики (показывается справа от текста при находке, в рамке «фототаблицы»).
alter table evidence add column if not exists image_url text;
