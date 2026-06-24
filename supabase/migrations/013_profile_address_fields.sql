alter table public.profiles
  add column if not exists street_address text,
  add column if not exists postal_code text,
  add column if not exists city text;

alter table public.profiles
  drop constraint if exists profiles_street_address_length,
  drop constraint if exists profiles_postal_code_length,
  drop constraint if exists profiles_city_length;

alter table public.profiles
  add constraint profiles_street_address_length check (street_address is null or char_length(street_address) <= 2048),
  add constraint profiles_postal_code_length check (postal_code is null or char_length(postal_code) <= 2048),
  add constraint profiles_city_length check (city is null or char_length(city) <= 2048);
