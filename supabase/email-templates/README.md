# Supabase Auth E-Mail-Templates

Diese Dateien sind genau die Supabase-Auth-Templates aus `Authentication > Templates`.
In Supabase jeweils den Subject-Wert setzen und den HTML-Inhalt der passenden Datei in `Body` kopieren.

Wichtig: `Site URL` muss in Supabase auf `https://www.gurken.family` stehen. SMTP-Linktracking für Auth-Mails deaktiviert lassen.

| Supabase Template | Subject | Body |
| --- | --- | --- |
| Confirm sign up | `Gurken Treffen: E-Mail bestätigen` | `confirm-sign-up.html` |
| Invite user | `Einladung zum Gurken Treffen` | `invite-user.html` |
| Magic link or OTP | `Gurken Treffen: Login-Link oder Code` | `magic-link-or-otp.html` |
| Change email address | `Gurken Treffen: Neue E-Mail bestätigen` | `change-email-address.html` |
| Reset password | `Gurken Treffen: Passwort zurücksetzen` | `reset-password.html` |
| Reauthentication | `Gurken Treffen: Sicherheitscode` | `reauthentication.html` |

Die Templates für Signup, Invite, Magic Link und E-Mail-Änderung gehen direkt auf:

```text
{{ .SiteURL }}/auth/confirm/complete?token_hash={{ .TokenHash }}&type=...&email={{ .Email }}&next=...
```

Das ist absichtlich nicht `{{ .ConfirmationURL }}`, weil der generische Supabase-Link je nach Flow PKCE/browserabhängig sein kann.
