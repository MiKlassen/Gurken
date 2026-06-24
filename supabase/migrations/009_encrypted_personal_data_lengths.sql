alter table public.profiles
  drop constraint if exists profiles_first_name_length,
  drop constraint if exists profiles_last_name_length,
  drop constraint if exists profiles_hometown_length;

alter table public.profiles
  add constraint profiles_first_name_length check (first_name is null or char_length(first_name) <= 2048),
  add constraint profiles_last_name_length check (last_name is null or char_length(last_name) <= 2048),
  add constraint profiles_hometown_length check (hometown is null or char_length(hometown) <= 2048);

alter table public.bookings
  drop constraint if exists bookings_beer_region_length;

alter table public.bookings
  add constraint bookings_beer_region_length check (beer_crate_region is null or char_length(beer_crate_region) <= 2048);

alter table public.gallery_photos
  drop constraint if exists gallery_caption_length;

alter table public.gallery_photos
  add constraint gallery_caption_length check (caption is null or char_length(caption) <= 2048);
