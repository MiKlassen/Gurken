drop index if exists public.event_room_assignments_booking_idx;
create index if not exists event_room_assignments_assigned_by_idx on public.event_room_assignments(assigned_by);
