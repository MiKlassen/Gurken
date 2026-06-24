create table if not exists public.email_templates (
  key text primary key,
  name text not null,
  subject text not null,
  text_body text not null,
  html_body text not null,
  updated_by uuid references auth.users(id) on delete set null,
  updated_at timestamptz not null default now()
);

alter table public.email_templates enable row level security;

drop trigger if exists set_email_templates_updated_at on public.email_templates;
create trigger set_email_templates_updated_at
before update on public.email_templates
for each row execute function public.set_updated_at();

drop policy if exists "Admins can manage email templates" on public.email_templates;
create policy "Admins can manage email templates"
on public.email_templates
for all
to authenticated
using (public.is_admin((select auth.uid())))
with check (public.is_admin((select auth.uid())));

revoke all on public.email_templates from anon;
grant select, insert, update, delete on public.email_templates to authenticated;
grant all on public.email_templates to service_role;

insert into public.email_templates (key, name, subject, text_body, html_body)
values
  (
    'booking_confirmation',
    'Buchungsbestätigung',
    'Deine Buchung für {{eventSubject}}',
    'Hallo {{firstName}},

deine Buchung für {{eventSubject}} ist gespeichert.

Buchung: {{bookingMode}}
Zeitraum: {{bookingPeriod}}
Personen: {{participantCount}}
Bierkastenpflicht: {{beerCrates}}
Bierkasten-Region: {{beerCrateRegion}}
Betrag: {{amount}}
Status: {{status}}

Zahlungsdaten:
{{paymentLines}}

Deine Buchungsbestätigung findest du hier:
{{confirmationUrl}}

Sobald ein Admin deine Zahlung als bezahlt markiert hat, ändert sich dein Status im Mitgliederbereich.',
    '<p>Hallo {{firstName}},</p>
<p>deine Buchung für <strong>{{eventSubject}}</strong> ist gespeichert.</p>
<table>
  <tr><td>Buchung</td><td>{{bookingMode}}</td></tr>
  <tr><td>Zeitraum</td><td>{{bookingPeriod}}</td></tr>
  <tr><td>Personen</td><td>{{participantCount}}</td></tr>
  <tr><td>Bierkastenpflicht</td><td>{{beerCrates}}</td></tr>
  <tr><td>Bierkasten-Region</td><td>{{beerCrateRegion}}</td></tr>
  <tr><td>Betrag</td><td><strong>{{amount}}</strong></td></tr>
  <tr><td>Status</td><td>{{status}}</td></tr>
</table>
<p><strong>Zahlungsdaten</strong><br>{{paymentHtml}}</p>
<p><a href="{{confirmationUrl}}">Buchungsbestätigung öffnen</a></p>
<p>Sobald ein Admin deine Zahlung als bezahlt markiert hat, ändert sich dein Status im Mitgliederbereich.</p>'
  ),
  (
    'payment_reminder',
    'Zahlungsreminder',
    'Zahlung offen: {{eventSubject}}',
    'Hallo {{firstName}},

du hast für {{eventSubject}} gebucht, aber deine Zahlung ist noch offen.

Buchung: {{bookingMode}}
Zeitraum: {{bookingPeriod}}
Personen: {{participantCount}}
Bierkastenpflicht: {{beerCrates}}
Betrag: {{amount}}

Zahlungsdaten:
{{paymentLines}}

Sobald ein Admin deine Zahlung als bezahlt markiert hat, bekommst du keine Reminder mehr.
{{dashboardUrl}}',
    '<p>Hallo {{firstName}},</p>
<p>du hast für <strong>{{eventSubject}}</strong> gebucht, aber deine Zahlung ist noch offen.</p>
<table>
  <tr><td>Buchung</td><td>{{bookingMode}}</td></tr>
  <tr><td>Zeitraum</td><td>{{bookingPeriod}}</td></tr>
  <tr><td>Personen</td><td>{{participantCount}}</td></tr>
  <tr><td>Bierkastenpflicht</td><td>{{beerCrates}}</td></tr>
  <tr><td>Betrag</td><td><strong>{{amount}}</strong></td></tr>
</table>
<p><strong>Zahlungsdaten</strong><br>{{paymentHtml}}</p>
<p>Sobald ein Admin deine Zahlung als bezahlt markiert hat, bekommst du keine Reminder mehr.</p>
<p><a href="{{dashboardUrl}}">Mitgliederbereich öffnen</a></p>'
  )
on conflict (key) do nothing;

create index if not exists email_templates_updated_by_idx
on public.email_templates(updated_by);
