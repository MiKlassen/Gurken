create or replace function public.upsert_booking_v2(
  p_event_id uuid,
  p_mode public.booking_mode,
  p_arrival_date date,
  p_departure_date date,
  p_day_guest_dates date[],
  p_participant_count integer,
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
  v_paid_amount integer := 0;
  v_nights integer;
begin
  if auth.uid() is null then
    raise exception 'Authentication required';
  end if;

  if p_participant_count is null or p_participant_count < 1 or p_participant_count > 3 then
    raise exception 'Participant count must be between 1 and 3';
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
      beer_crate_region
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
      nullif(trim(p_beer_crate_region), '')
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
        beer_crate_region = nullif(trim(p_beer_crate_region), '')
    where id = v_existing.id
    returning * into v_booking;
  end if;

  return v_booking;
end;
$$;

revoke execute on function public.upsert_booking_v2(uuid, public.booking_mode, date, date, date[], integer, text) from public, anon;
grant execute on function public.upsert_booking_v2(uuid, public.booking_mode, date, date, date[], integer, text) to authenticated;

with recalculated as (
  select
    b.id,
    (e.day_guest_price_cents + greatest(b.departure_date - b.arrival_date, 0) * e.overnight_price_cents) * b.participant_count as new_amount,
    case
      when b.status = 'waitlisted' then b.status
      when coalesce(b.paid_amount_cents, 0) > 0
        and coalesce(b.paid_amount_cents, 0) >= (e.day_guest_price_cents + greatest(b.departure_date - b.arrival_date, 0) * e.overnight_price_cents) * b.participant_count
        then 'paid'::public.booking_status
      else 'pending_payment'::public.booking_status
    end as new_status
  from public.bookings b
  join public.events e on e.id = b.event_id
  where b.mode = 'overnight'
    and b.status <> 'cancelled'
    and b.arrival_date is not null
    and b.departure_date is not null
)
update public.bookings b
set amount_cents = recalculated.new_amount,
    status = recalculated.new_status
from recalculated
where b.id = recalculated.id
  and (
    b.amount_cents is distinct from recalculated.new_amount
    or b.status is distinct from recalculated.new_status
  );
