alter table public.profiles
  add column if not exists expected_arrival_at text;

alter table public.profiles
  drop constraint if exists profiles_expected_arrival_at_length;

alter table public.profiles
  add constraint profiles_expected_arrival_at_length check (
    expected_arrival_at is null or char_length(expected_arrival_at) <= 2048
  );
