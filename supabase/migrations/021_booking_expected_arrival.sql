alter table public.bookings
  add column if not exists expected_arrival_at text;

alter table public.bookings
  drop constraint if exists bookings_expected_arrival_at_length;

alter table public.bookings
  add constraint bookings_expected_arrival_at_length check (
    expected_arrival_at is null or char_length(expected_arrival_at) <= 2048
  );

drop function if exists public.upsert_booking_v2(uuid, public.booking_mode, date, date, date[], integer, text);

create or replace function public.upsert_booking_v2(
  p_event_id uuid,
  p_mode public.booking_mode,
  p_arrival_date date,
  p_departure_date date,
  p_day_guest_dates date[],
  p_participant_count integer,
  p_beer_crate_region text,
  p_expected_arrival_at text,
  p_expected_arrival_date date
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
  v_paid_amount integer := 0;
  v_nights integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_participant_count is null or p_participant_count < 1 or p_participant_count > 3 then
    raise exception 'Participant count must be between 1 and 3';
  end if;

  if nullif(trim(p_expected_arrival_at), '') is null or p_expected_arrival_date is null then
    raise exception 'Ankunft muss angegeben werden';
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

  if v_existing.id is not null then
    v_paid_amount := coalesce(v_existing.paid_amount_cents, 0);
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

    if p_expected_arrival_date < p_arrival_date or p_expected_arrival_date > p_departure_date then
      raise exception 'Ankunft muss innerhalb der gebuchten Tage liegen';
    end if;

    v_nights := p_departure_date - p_arrival_date;
    v_amount := (v_event.day_guest_price_cents + v_nights * v_event.overnight_price_cents) * p_participant_count;
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

    if p_expected_arrival_date <> all(p_day_guest_dates) then
      raise exception 'Ankunft muss innerhalb der gebuchten Tage liegen';
    end if;

    v_amount := cardinality(p_day_guest_dates) * v_event.day_guest_price_cents * p_participant_count;
    p_arrival_date := null;
    p_departure_date := null;
  end if;

  select coalesce(sum(participant_count), 0)
    into v_taken_slots
  from public.bookings
  where event_id = p_event_id
    and status in ('pending_payment', 'paid')
    and (v_existing.id is null or id <> v_existing.id);

  if v_taken_slots + p_participant_count > v_event.member_limit then
    if v_existing.id is not null and v_existing.status <> 'waitlisted' then
      raise exception 'Nicht genügend freie Plätze für diese Änderung';
    end if;

    v_status := 'waitlisted';
  elsif v_paid_amount > 0 and v_paid_amount >= v_amount then
    v_status := 'paid';
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
      participant_count,
      amount_cents,
      status,
      beer_crate_region,
      expected_arrival_at
    )
    values (
      p_event_id,
      auth.uid(),
      p_mode,
      p_arrival_date,
      p_departure_date,
      p_day_guest_dates,
      p_participant_count,
      v_amount,
      v_status,
      nullif(trim(p_beer_crate_region), ''),
      nullif(trim(p_expected_arrival_at), '')
    )
    returning * into v_booking;
  else
    update public.bookings
    set mode = p_mode,
        arrival_date = p_arrival_date,
        departure_date = p_departure_date,
        day_guest_dates = p_day_guest_dates,
        participant_count = p_participant_count,
        amount_cents = v_amount,
        status = v_status,
        beer_crate_region = nullif(trim(p_beer_crate_region), ''),
        expected_arrival_at = nullif(trim(p_expected_arrival_at), '')
    where id = v_existing.id
    returning * into v_booking;
  end if;

  return v_booking;
end;
$$;

revoke execute on function public.upsert_booking_v2(uuid, public.booking_mode, date, date, date[], integer, text, text, date) from public, anon;
grant execute on function public.upsert_booking_v2(uuid, public.booking_mode, date, date, date[], integer, text, text, date) to authenticated;
