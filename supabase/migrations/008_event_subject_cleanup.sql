update public.events
set subject = name
where name ilike '%' || year::text || '%'
  and subject = trim(name || ' ' || year::text);
