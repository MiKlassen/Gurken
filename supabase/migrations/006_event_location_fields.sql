alter table public.events
  add column if not exists location_address text,
  add column if not exists location_url text,
  add column if not exists location_meta_label_1 text,
  add column if not exists location_meta_value_1 text,
  add column if not exists location_meta_label_2 text,
  add column if not exists location_meta_value_2 text;
