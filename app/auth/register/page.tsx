import Link from "next/link";
import { Sprout } from "lucide-react";
import { signUpAction } from "@/app/actions/auth";
import { BrandHeader } from "@/components/brand-header";
import { SubmitButton } from "@/components/submit-button";
import { TurnstileWidget } from "@/components/turnstile-widget";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function RegisterPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";

  return (
    <main className="auth-shell">
      <BrandHeader />
      <section className="auth-card">
        <div>
          <Sprout size={34} />
          <h1>Registrieren</h1>
          <p>Offene Registrierung, aber mit Turnstile und Mailverifizierung.</p>
        </div>
        {error ? <p className="notice error">{error}</p> : null}
        <form className="form-panel" action={signUpAction}>
          <label>
            E-Mail
            <input type="email" name="email" autoComplete="email" required />
          </label>
          <label>
            Passwort
            <input type="password" name="password" minLength={8} autoComplete="new-password" required />
          </label>
          <TurnstileWidget />
          <SubmitButton pendingLabel="Registriert...">Account anlegen</SubmitButton>
        </form>
        <p className="legal-note">
          Hinweise zur Verarbeitung deiner Daten findest du in der <Link href="/datenschutz">Datenschutzerklärung</Link>.
        </p>
        <p>
          Schon registriert? <Link href="/auth/login">Einloggen</Link>
        </p>
      </section>
    </main>
  );
}
