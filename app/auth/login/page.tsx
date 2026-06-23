import Link from "next/link";
import { LockKeyhole } from "lucide-react";
import { signInAction, resetPasswordAction } from "@/app/actions/auth";
import { BrandHeader } from "@/components/brand-header";
import { SubmitButton } from "@/components/submit-button";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const message = typeof params.message === "string" ? params.message : "";

  return (
    <main className="auth-shell">
      <BrandHeader />
      <section className="auth-card">
        <div>
          <LockKeyhole size={32} />
          <h1>Einloggen</h1>
          <p>Rein in den Gurkenbereich.</p>
        </div>
        {error ? <p className="notice error">{error}</p> : null}
        {message ? <p className="notice success">{message}</p> : null}
        <form className="form-panel" action={signInAction}>
          <label>
            E-Mail
            <input type="email" name="email" autoComplete="email" required />
          </label>
          <label>
            Passwort
            <input type="password" name="password" autoComplete="current-password" required />
          </label>
          <SubmitButton>Einloggen</SubmitButton>
        </form>
        <form className="inline-reset" action={resetPasswordAction}>
          <input type="email" name="email" placeholder="Mail fuer Reset" aria-label="E-Mail fuer Passwort-Reset" />
          <SubmitButton className="button secondary small" pendingLabel="Sendet...">
            Reset-Mail
          </SubmitButton>
        </form>
        <p>
          Noch kein Account? <Link href="/auth/register">Registrieren</Link>
        </p>
      </section>
    </main>
  );
}
