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
- Buchung: Übernachtung pro Nacht oder Tagesgasttage, Betrag wird beim Absenden gespeichert.
- Zahlung: offline per IBAN/PayPal.me; Admin markiert Buchungen manuell als bezahlt.
- Galerie: verifizierte Mitglieder laden Bilder in den privaten Supabase-Storage-Bucket `gallery`; die App erzeugt Signed URLs.
