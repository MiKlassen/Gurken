alter table public.bookings
  add column if not exists payment_reminder_sent_at timestamptz,
  add column if not exists payment_reminder_count integer not null default 0;

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'bookings_payment_reminder_count_valid'
      and conrelid = 'public.bookings'::regclass
  ) then
    alter table public.bookings
      add constraint bookings_payment_reminder_count_valid check (payment_reminder_count >= 0);
  end if;
end;
$$;

create index if not exists bookings_payment_reminder_due_idx
  on public.bookings (status, payment_reminder_sent_at)
  where status = 'pending_payment';
