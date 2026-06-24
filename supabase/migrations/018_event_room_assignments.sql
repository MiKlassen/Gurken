create table if not exists public.event_room_assignments (
  id uuid primary key default gen_random_uuid(),
  room_id uuid not null references public.event_rooms(id) on delete cascade,
  booking_id uuid not null references public.bookings(id) on delete cascade,
  assigned_by uuid references auth.users(id) on delete set null,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_room_assignments_booking_unique unique (booking_id),
  constraint event_room_assignments_notes_length check (notes is null or char_length(notes) <= 1000)
);

create index if not exists event_room_assignments_room_idx on public.event_room_assignments(room_id);
create index if not exists event_room_assignments_assigned_by_idx on public.event_room_assignments(assigned_by);

drop trigger if exists event_room_assignments_set_updated_at on public.event_room_assignments;
create trigger event_room_assignments_set_updated_at
  before update on public.event_room_assignments
  for each row
  execute function public.set_updated_at();

alter table public.event_room_assignments enable row level security;

drop policy if exists "Admins can read event room assignments" on public.event_room_assignments;
create policy "Admins can read event room assignments"
  on public.event_room_assignments
  for select
  to authenticated
  using (public.is_admin());

drop policy if exists "Admins can insert event room assignments" on public.event_room_assignments;
create policy "Admins can insert event room assignments"
  on public.event_room_assignments
  for insert
  to authenticated
  with check (public.is_admin());

drop policy if exists "Admins can update event room assignments" on public.event_room_assignments;
create policy "Admins can update event room assignments"
  on public.event_room_assignments
  for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "Admins can delete event room assignments" on public.event_room_assignments;
create policy "Admins can delete event room assignments"
  on public.event_room_assignments
  for delete
  to authenticated
  using (public.is_admin());
