-- Дача: панорама пересобрана из цилиндрической ленты (улики ближе к горизонту, без воронки),
-- убран лишний второй пейджер; нижний край вида ограничен там, где кончается картинка.
alter table locations add column if not exists pano_min_pitch real;
update locations set image_url = 'https://zhdvfvrqgunjickiaoqi.supabase.co/storage/v1/object/public/location-images/v2-dacha-pano4.jpg',
       pano_min_pitch = -56
 where id = '29196055-161c-5b4e-a38f-352cbf3e5032';
notify pgrst, 'reload schema';
select name, image_url, pano_yaw, pano_pitch, pano_min_pitch from locations where id = '29196055-161c-5b4e-a38f-352cbf3e5032';
