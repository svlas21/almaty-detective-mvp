-- Обманки, привязанные к локации: предмет виден на панораме, но к делу не относится.
-- found_text — что игрок узнаёт, выбрав такой предмет (вместо «Здесь такого не нашли»).
alter table case_decoy_categories add column if not exists location_id uuid references locations(id) on delete cascade;
alter table case_decoy_categories add column if not exists found_text text;
