create extension if not exists pgcrypto;

create type public.booking_mode as enum ('overnight', 'day_guest');
create type public.booking_status as enum ('pending_payment', 'paid', 'waitlisted', 'cancelled');

create table public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  first_name text,
  last_name text,
  hometown text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint profiles_first_name_length check (first_name is null or char_length(first_name) between 1 and 120),
  constraint profiles_last_name_length check (last_name is null or char_length(last_name) between 1 and 120),
  constraint profiles_hometown_length check (hometown is null or char_length(hometown) between 1 and 160)
);

create table public.admin_memberships (
  user_id uuid primary key references auth.users(id) on delete cascade,
  granted_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now()
);

create table public.events (
  id uuid primary key default gen_random_uuid(),
  year integer not null,
  name text not null,
  slug text not null unique,
  is_active boolean not null default false,
  starts_on date not null,
  ends_on date not null,
  public_summary text not null default '',
  location_label text not null default '',
  location_details text not null default '',
  member_limit integer not null,
  overnight_price_cents integer not null default 0,
  day_guest_price_cents integer not null default 0,
  payment_iban text,
  payment_paypal_url text,
  payment_note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint events_dates_valid check (ends_on >= starts_on),
  constraint events_limit_valid check (member_limit > 0),
  constraint events_prices_valid check (overnight_price_cents >= 0 and day_guest_price_cents >= 0)
);

create unique index events_single_active_idx on public.events (is_active) where is_active;
create index events_starts_on_idx on public.events (starts_on desc);

create table public.bookings (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  mode public.booking_mode not null,
  arrival_date date,
  departure_date date,
  day_guest_dates date[],
  amount_cents integer not null,
  status public.booking_status not null default 'pending_payment',
  beer_crate_region text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint bookings_amount_valid check (amount_cents >= 0),
  constraint bookings_beer_region_length check (beer_crate_region is null or char_length(beer_crate_region) <= 160)
);

create unique index bookings_one_open_per_user_idx
  on public.bookings (event_id, user_id)
  where status <> 'cancelled';

create index bookings_event_status_idx on public.bookings (event_id, status);
create index bookings_user_idx on public.bookings (user_id);

create table public.gallery_photos (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  storage_path text not null unique,
  caption text,
  created_at timestamptz not null default now(),
  constraint gallery_caption_length check (caption is null or char_length(caption) <= 140)
);

create index gallery_event_created_idx on public.gallery_photos (event_id, created_at desc);

create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function public.set_updated_at();

create trigger events_set_updated_at
before update on public.events
for each row execute function public.set_updated_at();

create trigger bookings_set_updated_at
before update on public.bookings
for each row execute function public.set_updated_at();

create or replace function public.is_admin(check_user_id uuid default auth.uid())
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.admin_memberships
    where user_id = check_user_id
  );
$$;

create or replace function public.grant_admin_by_email(target_email text)
returns uuid
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  target_user_id uuid;
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then
    raise exception 'Only admins can grant admin access';
  end if;

  select id
    into target_user_id
  from auth.users
  where lower(email) = lower(target_email)
  limit 1;

  if target_user_id is null then
    raise exception 'No user found for email %', target_email;
  end if;

  insert into public.admin_memberships (user_id, granted_by)
  values (target_user_id, auth.uid())
  on conflict (user_id) do nothing;

  return target_user_id;
end;
$$;

create or replace function public.upsert_booking(
  p_event_id uuid,
  p_mode public.booking_mode,
  p_arrival_date date,
  p_departure_date date,
  p_day_guest_dates date[],
  p_beer_crate_region text
)
returns public.bookings
language plpgsql
security definer
set search_path = public
as $$
declare
  v_event public.events%rowtype;
  v_existing public.bookings%rowtype;
  v_booking public.bookings%rowtype;
  v_taken_slots integer;
  v_status public.booking_status;
  v_amount integer;
  v_nights integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  select *
    into v_event
  from public.events
  where id = p_event_id
  for update;

  if not found or not v_event.is_active then
    raise exception 'Active event not found';
  end if;

  select *
    into v_existing
  from public.bookings
  where event_id = p_event_id
    and user_id = auth.uid()
    and status <> 'cancelled'
  for update;

  if found and v_existing.status = 'paid' then
    raise exception 'Paid bookings can only be changed by admins';
  end if;

  if p_mode = 'overnight' then
    if p_arrival_date is null or p_departure_date is null then
      raise exception 'Arrival and departure are required';
    end if;

    if p_arrival_date < v_event.starts_on
       or p_departure_date > v_event.ends_on
       or p_departure_date <= p_arrival_date then
      raise exception 'Booking dates are outside the event range';
    end if;

    v_nights := p_departure_date - p_arrival_date;
    v_amount := v_nights * v_event.overnight_price_cents;
    p_day_guest_dates := null;
  else
    if p_day_guest_dates is null or cardinality(p_day_guest_dates) = 0 then
      raise exception 'At least one day guest date is required';
    end if;

    if exists (
      select 1
      from unnest(p_day_guest_dates) as selected_day
      where selected_day < v_event.starts_on or selected_day > v_event.ends_on
    ) then
      raise exception 'Day guest dates are outside the event range';
    end if;

    v_amount := cardinality(p_day_guest_dates) * v_event.day_guest_price_cents;
    p_arrival_date := null;
    p_departure_date := null;
  end if;

  select count(*)
    into v_taken_slots
  from public.bookings
  where event_id = p_event_id
    and status in ('pending_payment', 'paid')
    and (v_existing.id is null or id <> v_existing.id);

  if v_taken_slots >= v_event.member_limit then
    v_status := 'waitlisted';
  else
    v_status := 'pending_payment';
  end if;

  if v_existing.id is null then
    insert into public.bookings (
      event_id,
      user_id,
      mode,
      arrival_date,
      departure_date,
      day_guest_dates,
      amount_cents,
      status,
      beer_crate_region
    )
    values (
      p_event_id,
      auth.uid(),
      p_mode,
      p_arrival_date,
      p_departure_date,
      p_day_guest_dates,
      v_amount,
      v_status,
      nullif(trim(p_beer_crate_region), '')
    )
    returning * into v_booking;
  else
    update public.bookings
    set mode = p_mode,
        arrival_date = p_arrival_date,
        departure_date = p_departure_date,
        day_guest_dates = p_day_guest_dates,
        amount_cents = v_amount,
        status = v_status,
        beer_crate_region = nullif(trim(p_beer_crate_region), '')
    where id = v_existing.id
    returning * into v_booking;
  end if;

  return v_booking;
end;
$$;

alter table public.profiles enable row level security;
alter table public.admin_memberships enable row level security;
alter table public.events enable row level security;
alter table public.bookings enable row level security;
alter table public.gallery_photos enable row level security;

create policy "Users can read own profile and admins can read all"
on public.profiles for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "Users can insert own profile"
on public.profiles for insert
to authenticated
with check (user_id = auth.uid());

create policy "Users can update own profile and admins can update all"
on public.profiles for update
to authenticated
using (user_id = auth.uid() or public.is_admin())
with check (user_id = auth.uid() or public.is_admin());

create policy "Admins and self can read admin memberships"
on public.admin_memberships for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "Admins can manage admin memberships"
on public.admin_memberships for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Authenticated users can read events"
on public.events for select
to authenticated
using (true);

create policy "Admins can manage events"
on public.events for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Users can read own bookings and admins can read all"
on public.bookings for select
to authenticated
using (user_id = auth.uid() or public.is_admin());

create policy "Admins can manage bookings"
on public.bookings for all
to authenticated
using (public.is_admin())
with check (public.is_admin());

create policy "Authenticated users can read gallery photos"
on public.gallery_photos for select
to authenticated
using (true);

create policy "Users can insert own gallery photos"
on public.gallery_photos for insert
to authenticated
with check (user_id = auth.uid());

create policy "Admins can delete gallery photos"
on public.gallery_photos for delete
to authenticated
using (public.is_admin());

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values (
  'gallery',
  'gallery',
  false,
  10485760,
  array['image/jpeg', 'image/png', 'image/webp', 'image/gif']
)
on conflict (id) do update
set public = excluded.public,
    file_size_limit = excluded.file_size_limit,
    allowed_mime_types = excluded.allowed_mime_types;

create policy "Authenticated users can upload gallery objects"
on storage.objects for insert
to authenticated
with check (bucket_id = 'gallery');

create policy "Authenticated users can read gallery objects"
on storage.objects for select
to authenticated
using (bucket_id = 'gallery');

create policy "Admins can delete gallery objects"
on storage.objects for delete
to authenticated
using (bucket_id = 'gallery' and public.is_admin());

grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.grant_admin_by_email(text) to authenticated;
grant execute on function public.upsert_booking(uuid, public.booking_mode, date, date, date[], text) to authenticated;
