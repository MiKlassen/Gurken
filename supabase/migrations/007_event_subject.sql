alter table public.events
  add column if not exists subject text not null default '';

update public.events
set subject = case
  when name ilike '%' || year::text || '%' then name
  else trim(name || ' ' || year::text)
end
where subject = '';
