import Link from "next/link";
import { MailCheck } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function VerifyPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const email = typeof params.email === "string" ? params.email : "";

  return (
    <main className="auth-shell">
      <BrandHeader />
      <section className="auth-card">
        <MailCheck size={40} />
        <h1>Mail bestätigen</h1>
        <p>
          {email ? `Wir haben ${email} eine Bestätigung geschickt.` : "Bitte bestätige deine Mailadresse."} Danach
          geht es mit dem Onboarding weiter.
        </p>
        <Link className="button primary" href="/auth/login">
          Zum Login
        </Link>
      </section>
    </main>
  );
}
