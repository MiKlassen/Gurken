import Link from "next/link";
import type { Route } from "next";
import { MailCheck } from "lucide-react";
import { confirmEmailCodeAction } from "@/app/actions/auth";
import { BrandHeader } from "@/components/brand-header";
import { SubmitButton } from "@/components/submit-button";
import { createClient } from "@/lib/supabase/server";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function param(params: Record<string, string | string[] | undefined>, key: string) {
  const value = params[key];
  return typeof value === "string" ? value : "";
}

function safeNextPath(value: string) {
  if (value.startsWith("/") && !value.startsWith("//")) return value;
  return "/onboarding";
}

function safeEmailCodeType(value: string) {
  return ["email", "invite", "magiclink", "recovery", "email_change"].includes(value) ? value : "email";
}

export default async function ConfirmPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const email = param(params, "email");
  const error = param(params, "error");
  const message = param(params, "message");
  const next = safeNextPath(param(params, "next"));
  const type = safeEmailCodeType(param(params, "type"));

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();
  const isVerified = Boolean(user?.email_confirmed_at || user?.confirmed_at);

  return (
    <main className="auth-shell">
      <BrandHeader />
      <section className="auth-card">
        <div>
          <MailCheck size={40} />
          <h1>E-Mail bestätigen</h1>
          <p>
            {isVerified
              ? "Deine E-Mail-Adresse ist bestätigt. Du kannst jetzt weiter ins Onboarding."
              : "Öffne den Bestätigungslink aus der Mail oder gib den Bestätigungscode ein."}
          </p>
        </div>

        {message ? <p className="notice success">{message}</p> : null}
        {error ? <p className="notice error">{error}</p> : null}

        {isVerified ? (
          <Link className="button primary" href={next as Route}>
            Weiter
          </Link>
        ) : (
          <>
            <form className="form-panel" action={confirmEmailCodeAction}>
              <input type="hidden" name="next" value={next} />
              <input type="hidden" name="type" value={type} />
              <label>
                E-Mail
                <input type="email" name="email" autoComplete="email" defaultValue={email} required />
              </label>
              <label>
                Bestätigungscode
                <input name="token" inputMode="numeric" autoComplete="one-time-code" placeholder="12345678" required />
              </label>
              <SubmitButton pendingLabel="Prüft...">Code bestätigen</SubmitButton>
            </form>
            <p>
              Schon bestätigt? <Link href="/auth/login">Einloggen</Link>
            </p>
          </>
        )}
      </section>
    </main>
  );
}
