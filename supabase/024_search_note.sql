-- Запись в протокол при осмотре локации без улик («пустой обыск» как подсказка).
alter table locations add column if not exists search_note text;
notify pgrst, 'reload schema';
