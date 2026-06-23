create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = public
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop function if exists public.grant_admin_by_email(text);

revoke execute on function public.is_admin(uuid) from public, anon;
revoke execute on function public.upsert_booking(uuid, public.booking_mode, date, date, date[], text) from public, anon;
grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.upsert_booking(uuid, public.booking_mode, date, date, date[], text) to authenticated;

create index if not exists admin_memberships_granted_by_idx on public.admin_memberships (granted_by);
create index if not exists gallery_photos_user_id_idx on public.gallery_photos (user_id);
