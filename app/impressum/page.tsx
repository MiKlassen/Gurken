import type { Metadata } from "next";
import Link from "next/link";
import { FileText } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { getHeaderAuthState } from "@/lib/header-auth";

export const metadata: Metadata = {
  title: "Impressum | Gurken Treffen",
  description: "Impressum für das interne Gurken Treffen."
};

export const dynamic = "force-dynamic";

export default async function ImpressumPage() {
  const headerAuth = await getHeaderAuthState();
  const backHref = headerAuth.isAuthed ? "/dashboard" : "/";

  return (
    <main className="app-shell">
      <BrandHeader isAuthed={headerAuth.isAuthed} isAdmin={headerAuth.isAdmin} />
      <section className="page-heading">
        <FileText size={34} />
        <div>
          <h1>Impressum</h1>
          <p>Angaben gemäß § 5 TMG</p>
        </div>
      </section>

      <article className="panel legal-content">
        <section>
          <h2>Anbieter</h2>
          <address>
            <strong>Michael Klassen</strong>
            <br />
            Bonhoefferstraße 42
            <br />
            58739 Wickede
            <br />
            E-Mail: <a href="mailto:michael@klassen.ruhr">michael@klassen.ruhr</a>
          </address>
        </section>

        <section>
          <h2>Verantwortlich für den Inhalt</h2>
          <p>Michael Klassen, Anschrift wie oben.</p>
        </section>

        <section>
          <h2>Hinweis</h2>
          <p>
            Diese App ist für die interne Organisation des Gurken Treffens vorgesehen. Inhalte und Buchungsdaten sind
            nicht für eine öffentliche Nutzung bestimmt.
          </p>
        </section>

        <p className="legal-backlink">
          <Link href={backHref}>{headerAuth.isAuthed ? "Zurück zum Mitgliederbereich" : "Zurück zur Startseite"}</Link>
        </p>
      </article>
    </main>
  );
}
