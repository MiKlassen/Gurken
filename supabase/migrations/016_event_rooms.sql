create table if not exists public.event_rooms (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  name text not null,
  is_multi_bed boolean not null default true,
  bed_count integer not null default 1,
  notes text,
  sort_order integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint event_rooms_name_length check (char_length(name) between 1 and 160),
  constraint event_rooms_bed_count_valid check (bed_count between 1 and 100),
  constraint event_rooms_notes_length check (notes is null or char_length(notes) <= 1000)
);

create index if not exists event_rooms_event_sort_idx on public.event_rooms(event_id, sort_order, name);

drop trigger if exists event_rooms_set_updated_at on public.event_rooms;
create trigger event_rooms_set_updated_at
  before update on public.event_rooms
  for each row
  execute function public.set_updated_at();

alter table public.event_rooms enable row level security;

drop policy if exists "Admins can read event rooms" on public.event_rooms;
create policy "Admins can read event rooms"
  on public.event_rooms
  for select
  to authenticated
  using (public.is_admin());

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
