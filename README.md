# Gurken Treffen

Internes Buchungssystem fuer das Stimme-Staemme-Treffen.

## Stack

- Next.js App Router, React, TypeScript
- Supabase Auth, Postgres, Storage
- Cloudflare Turnstile fuer Registrierung
- Vercel Deployment

## Setup

1. Dependencies installieren:
   ```bash
   pnpm install
   ```
2. `.env.example` nach `.env.local` uebernehmen und Werte setzen.
3. In Supabase die Migration `supabase/migrations/001_initial.sql` ausfuehren.
4. Optional `supabase/seed.sql` ausfuehren, um ein erstes aktives Treffen anzulegen.
5. `INITIAL_ADMIN_EMAILS` setzen. Wenn sich eine dieser Adressen verifiziert einloggt und `SUPABASE_SERVICE_ROLE_KEY` gesetzt ist, wird sie automatisch Admin.

## Lokale Befehle

```bash
pnpm dev
pnpm typecheck
pnpm build
```

## Wichtige Flows

- Registrierung: E-Mail/Passwort plus Turnstile, danach Supabase-Mailverifizierung.
- Onboarding: Vorname, Name und Wohnort sind Pflicht vor Mitgliederbereich/Buchung/Galerie.
- Buchung: Uebernachtung pro Nacht oder Tagesgasttage, Betrag wird beim Absenden gespeichert.
- Zahlung: offline per IBAN/PayPal.me; Admin markiert Buchungen manuell als bezahlt.
- Galerie: verifizierte Mitglieder laden Bilder in den privaten Supabase-Storage-Bucket `gallery`; die App erzeugt Signed URLs.
