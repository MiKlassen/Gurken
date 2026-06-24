# Gurken Treffen

Internes Buchungssystem für das Stimme-Stämme-Treffen.

## Stack

- Next.js App Router, React, TypeScript
- Supabase Auth, Postgres, Storage
- Cloudflare Turnstile für Registrierung
- Vercel Deployment

## Setup

1. Dependencies installieren:
   ```bash
   pnpm install
   ```
2. `.env.example` nach `.env.local` übernehmen und Werte setzen. Als Supabase-Client-Key akzeptiert die App `NEXT_PUBLIC_SUPABASE_ANON_KEY` oder `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
3. In Supabase die Migration `supabase/migrations/001_initial.sql` ausführen.
4. Optional `supabase/seed.sql` ausführen, um ein erstes aktives Treffen anzulegen.
5. `PERSONAL_DATA_ENCRYPTION_KEY` setzen. Der Wert muss ein 32-Byte-Schlüssel sein, z. B. erzeugt mit:
   ```bash
   node -e "console.log(require('crypto').randomBytes(32).toString('base64url'))"
   ```
   Den Schlüssel nur serverseitig setzen, niemals mit `NEXT_PUBLIC_` prefixen. Ohne diesen Schlüssel können neue Profile, Buchungen und Galerie-Captions nicht verschlüsselt gespeichert werden.
6. `INITIAL_ADMIN_EMAILS` setzen. Wenn sich eine dieser Adressen verifiziert einloggt und `SUPABASE_SERVICE_ROLE_KEY` gesetzt ist, wird sie automatisch Admin.

## Lokale Befehle

```bash
pnpm dev
pnpm typecheck
pnpm build
```

## Wichtige Flows

- Registrierung: E-Mail/Passwort plus Turnstile, danach Supabase-Mailverifizierung.
- Onboarding: Vorname, Name und Wohnort sind Pflicht vor Mitgliederbereich/Buchung/Galerie.
- Buchung: Übernachtung pro Nacht oder Tagesgasttage für 1 bis 3 Personen, Betrag wird pro Person berechnet und beim Absenden gespeichert.
- Zahlung: offline per IBAN/PayPal.me; Admin markiert Buchungen manuell als bezahlt.
- Zahlungsreminder: Vercel Cron ruft stündlich `/api/cron/payment-reminders` auf. Ob und wann Mails rausgehen, entscheidet die Admin-Konfiguration in Supabase. Offene Buchungen (`pending_payment`) bekommen nach dem konfigurierten Intervall erneut eine SMTP-Mail, bis ein Admin sie als bezahlt markiert.
- Ort: verifizierte Mitglieder sehen Adresse, Ortslink, Hinweise und zwei optionale Zusatzfelder auf `/location`.
- Galerie: verifizierte Mitglieder laden ein oder mehrere Bilder in den privaten Supabase-Storage-Bucket `gallery`; die App erzeugt Signed URLs.
- Mobile Galerie: die App hat ein Web-Share-Target. Nach Installation auf dem Handy können Bilder aus anderen Apps per Teilen-Menü an die Live-Galerie gesendet werden.

## Verschlüsselung personenbezogener Inhaltsfelder

Die App verschlüsselt personenbezogene Inhaltsfelder in den öffentlichen App-Tabellen vor dem Schreiben in Supabase mit AES-256-GCM. Dazu gehören Profilfelder (`first_name`, `last_name`, `hometown`), die Bierkasten-Region und Galerie-Captions. Alte Klartextwerte bleiben lesbar, neue Werte werden verschlüsselt gespeichert.

Supabase Auth benötigt E-Mail-Adressen, User-IDs und Login-Metadaten für Authentifizierung, Verifizierung und Passwort-Reset. Diese Auth-Daten liegen im Supabase-Auth-System und werden nicht mit `PERSONAL_DATA_ENCRYPTION_KEY` verschlüsselt. Der Schlüssel muss in Vercel als serverseitige Environment Variable in Production und Preview gesetzt werden.

## Zahlungsreminder per SMTP

Konfigurationsreihenfolge: Admin-System/Supabase-Datenbank vor Environment-Fallbacks. Secrets bleiben in Vercel/Supabase Environment Variables und werden nicht in der GUI gespeichert.

In Vercel müssen serverseitig diese Secrets gesetzt sein:

- `CRON_SECRET`: zufälliger Secret-Wert; Vercel sendet ihn automatisch als `Authorization: Bearer ...`.
- `SMTP_USER`
- `SMTP_PASSWORD`

Nicht-geheime Werte werden im Adminbereich unter Systemeinstellungen gepflegt:

- SMTP: Host, Port, TLS/STARTTLS, Absender, Reply-To, Timeout
- Reminder: aktiv/inaktiv, Intervall in Tagen, Batchgröße
- Cron: aktiv/inaktiv, Versandstunde, Zeitzone

Die gleichnamigen Env-Werte in `.env.example` sind nur Fallbacks, solange noch nichts in `app_settings` gespeichert ist.
