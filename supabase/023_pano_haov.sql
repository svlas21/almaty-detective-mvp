-- Частичная панорама: горизонтальный охват кадра в градусах.
-- null = полная 360°; иначе Pannellum показывает кадр без растяжения (haov/vaov).
alter table locations add column if not exists pano_haov real;
update locations set image_url = 'https://zhdvfvrqgunjickiaoqi.supabase.co/storage/v1/object/public/location-images/v2-kvartira-wide.jpg',
       pano_haov = 160
 where id = '78a34a22-6cc3-50d3-b3a7-bf4a481856bc';
notify pgrst, 'reload schema';
