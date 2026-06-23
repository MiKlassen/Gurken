insert into public.events (
  year,
  name,
  slug,
  is_active,
  starts_on,
  ends_on,
  public_summary,
  location_label,
  location_details,
  member_limit,
  overnight_price_cents,
  day_guest_price_cents,
  payment_iban,
  payment_paypal_url,
  payment_note
)
values (
  2026,
  'Stimme-Stämme Treffen 2026',
  'stimme-staemme-2026',
  true,
  '2026-08-14',
  '2026-08-17',
  'Ein internes Gurken-Wochenende mit Stimmen, Stämmen, Kaltgetränken und regionaler Bierkastenpflicht.',
  'Ort nach Login',
  'Hier den genauen Treffpunkt, Anreiseinfos, Schlafsituation und Hausregeln eintragen.',
  42,
  2500,
  1200,
  'DE00 0000 0000 0000 0000 00',
  'https://paypal.me/gurkenpool',
  'Bitte Namen im Verwendungszweck angeben.'
)
on conflict (slug) do update
set is_active = excluded.is_active,
    starts_on = excluded.starts_on,
    ends_on = excluded.ends_on,
    public_summary = excluded.public_summary,
    member_limit = excluded.member_limit,
    overnight_price_cents = excluded.overnight_price_cents,
    day_guest_price_cents = excluded.day_guest_price_cents;
