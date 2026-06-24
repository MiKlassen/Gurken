drop policy if exists "Admins can manage event rooms" on public.event_rooms;

drop policy if exists "Admins can insert event rooms" on public.event_rooms;
create policy "Admins can insert event rooms"
  on public.event_rooms
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update event rooms" on public.event_rooms;
create policy "Admins can update event rooms"
  on public.event_rooms
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete event rooms" on public.event_rooms;
create policy "Admins can delete event rooms"
  on public.event_rooms
  for delete
  to authenticated
  using (public.is_admin());
