-- «К делу не относится» теперь показывает плашка в интерфейсе — убираем повтор из текста.
update case_decoy_categories
set found_text = replace(found_text, E'\n\nК делу не относится.', '')
where found_text like '%К делу не относится.';
