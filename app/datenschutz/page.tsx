import type { Metadata } from "next";
import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";

export const metadata: Metadata = {
  title: "Datenschutz | Gurken Treffen",
  description: "Datenschutzhinweise für das interne Gurken Treffen."
};

export default function DatenschutzPage() {
  return (
    <main className="app-shell">
      <BrandHeader />
      <section className="page-heading">
        <ShieldCheck size={34} />
        <div>
          <h1>Datenschutzerklärung</h1>
          <p>Stand: 24.06.2026</p>
        </div>
      </section>

      <article className="panel legal-content">
        <p className="legal-warning">
          Diese Datenschutzerklärung ist als projektspezifische Vorlage angelegt. Verantwortliche Person, Anschrift und
          Datenschutzkontakt müssen vor Veröffentlichung verbindlich ergänzt und rechtlich geprüft werden.
        </p>

        <section>
          <h2>1. Verantwortliche Stelle</h2>
          <p>
            Verantwortlich für die Verarbeitung personenbezogener Daten im Rahmen dieser App ist:
          </p>
          <address>
            <strong>[Name / Organisation ergänzen]</strong>
            <br />
            [Straße, Hausnummer ergänzen]
            <br />
            [PLZ, Ort ergänzen]
            <br />
            E-Mail: [Datenschutzkontakt ergänzen]
          </address>
        </section>

        <section>
          <h2>2. Zwecke der Verarbeitung</h2>
          <p>
            Wir verarbeiten personenbezogene Daten, um das interne Treffen zu organisieren, Accounts bereitzustellen,
            Buchungen zu verwalten, Zahlungseingänge nachzuhalten, Erinnerungen zu versenden, den geschützten
            Mitgliederbereich bereitzustellen und die Live-Galerie während des Treffens zu betreiben.
          </p>
        </section>

        <section>
          <h2>3. Verarbeitete Daten</h2>
          <ul>
            <li>Accountdaten: E-Mail-Adresse, Passwort-Hash, Verifizierungsstatus und Login-Informationen.</li>
            <li>Profildaten: Vorname, Name und Wohnort.</li>
            <li>Buchungsdaten: Zeitraum, Tagesgast- oder Übernachtungsbuchung, Personenanzahl, Bierkasten-Region, Betrag und Zahlungsstatus.</li>
            <li>Admin-Daten: Admin-Rolle, Zeitpunkt der Vergabe und vergebende Person.</li>
            <li>Galeriedaten: hochgeladene Fotos, optionaler Caption-Text, Uploader und Upload-Zeitpunkt.</li>
            <li>Technische Daten: IP-Adresse, Browser-/Geräteinformationen, Logdaten, Session-Cookies und Turnstile-Prüfdaten.</li>
            <li>E-Mail-Daten: Empfängeradresse, Betreff, Versandzeitpunkt und Inhalt von System- oder Reminder-Mails.</li>
          </ul>
        </section>

        <section>
          <h2>4. Verschlüsselung in der Datenbank</h2>
          <p>
            Personenbezogene Inhaltsfelder in den App-Tabellen werden vor dem Speichern in der Datenbank
            anwendungsseitig verschlüsselt. Das betrifft insbesondere Profilangaben wie Vorname, Name und Wohnort,
            die Bierkasten-Region und optionale Galerie-Captions. Für die Authentifizierung notwendige Daten wie
            E-Mail-Adresse, User-ID, Verifizierungsstatus und technische Login-Metadaten werden durch Supabase Auth
            verarbeitet und müssen für Anmeldung, Mailverifizierung und Passwort-Reset systembedingt verfügbar bleiben.
          </p>
        </section>

        <section>
          <h2>5. Rechtsgrundlagen</h2>
          <p>
            Die Verarbeitung erfolgt, soweit sie für Anmeldung, Buchung und Durchführung des Treffens erforderlich ist,
            auf Grundlage von Art. 6 Abs. 1 lit. b DSGVO. Sicherheitsmaßnahmen, Missbrauchsschutz, Admin-Verwaltung,
            technische Logs und der zuverlässige Betrieb der App erfolgen auf Grundlage von Art. 6 Abs. 1 lit. f DSGVO.
            Freiwillige Foto-Uploads und optionale Angaben erfolgen auf Grundlage von Art. 6 Abs. 1 lit. a DSGVO bzw.
            im Rahmen der freiwilligen Teilnahme am Mitgliederbereich.
          </p>
        </section>

        <section>
          <h2>6. Registrierung, Login und Turnstile</h2>
          <p>
            Für Registrierung und Login nutzen wir Supabase Auth. Zur Absicherung der Registrierung gegen automatisierte
            Zugriffe wird Cloudflare Turnstile eingesetzt. Dabei können technische Prüf- und Browserdaten an Cloudflare
            übermittelt werden. Turnstile dient ausschließlich dem Schutz der Registrierung und nicht Werbezwecken.
          </p>
        </section>

        <section>
          <h2>7. Buchung, Zahlung und Reminder</h2>
          <p>
            Buchungsdaten werden zur Planung des Treffens, zur Berechnung des Beitrags und zur Nachverfolgung des
            Zahlungsstatus verarbeitet. Die Zahlung erfolgt offline per angezeigter IBAN oder über einen PayPal.me-Link.
            Bei Nutzung von PayPal gelten zusätzlich die Datenschutzinformationen von PayPal.
          </p>
          <p>
            Wenn eine Buchung noch nicht als bezahlt markiert ist, können automatische Reminder-Mails über den
            konfigurierten SMTP-Dienst versendet werden.
          </p>
        </section>

        <section>
          <h2>8. Live-Galerie</h2>
          <p>
            Hochgeladene Fotos sind im Mitgliederbereich und in der Slideshow für Teilnehmende sichtbar. Lade nur Bilder
            hoch, die im Mitgliederkreis gezeigt werden dürfen und für die die abgebildeten Personen mit der Nutzung im
            Rahmen des Treffens einverstanden sind. Auf Wunsch prüfen wir die Löschung einzelner Fotos.
          </p>
        </section>

        <section>
          <h2>9. Dienstleister und Hosting</h2>
          <p>
            Die App wird bei Vercel gehostet. Datenbank, Authentifizierung und Storage laufen über Supabase. Für
            Bot-Schutz nutzen wir Cloudflare Turnstile; je nach DNS-/CDN-Konfiguration kann Cloudflare außerdem
            technische Verbindungsdaten verarbeiten. Für System- und Reminder-Mails wird ein konfigurierter SMTP-Dienst
            genutzt. Mit eingesetzten Auftragsverarbeitern sollen passende Vereinbarungen zur Auftragsverarbeitung
            bestehen.
          </p>
          <ul>
            <li>
              <a href="https://vercel.com/legal/privacy-policy" target="_blank" rel="noreferrer">
                Datenschutz bei Vercel
              </a>
            </li>
            <li>
              <a href="https://supabase.com/privacy" target="_blank" rel="noreferrer">
                Datenschutz bei Supabase
              </a>
            </li>
            <li>
              <a href="https://www.cloudflare.com/privacypolicy/" target="_blank" rel="noreferrer">
                Datenschutz bei Cloudflare
              </a>
            </li>
            <li>
              <a href="https://www.paypal.com/de/webapps/mpp/ua/privacy-full" target="_blank" rel="noreferrer">
                Datenschutz bei PayPal
              </a>
            </li>
          </ul>
        </section>

        <section>
          <h2>10. Cookies und lokale Speicherung</h2>
          <p>
            Die App verwendet technisch notwendige Session- und Authentifizierungsdaten, damit Login, Mitgliederbereich
            und Uploads funktionieren. Es werden keine Marketing-Cookies und kein Werbetracking eingesetzt. Der
            Service Worker der App dient der App-Integration und verarbeitet Share-Target-Anfragen, ohne ein
            Werbeprofil zu erstellen.
          </p>
        </section>

        <section>
          <h2>11. Speicherdauer</h2>
          <p>
            Personenbezogene Daten werden nur so lange gespeichert, wie sie für Organisation, Durchführung,
            Abrechnung/Nachweis und Nachbereitung des Treffens erforderlich sind. Account-, Buchungs- und
            Galerie-Daten können nach Ende des Treffens gelöscht oder anonymisiert werden, soweit keine berechtigten
            Aufbewahrungsinteressen entgegenstehen. Technische Logs werden nach den Speicherfristen der eingesetzten
            Dienstleister gelöscht.
          </p>
        </section>

        <section>
          <h2>12. Deine Rechte</h2>
          <p>
            Du hast nach Maßgabe der DSGVO das Recht auf Auskunft, Berichtigung, Löschung, Einschränkung der
            Verarbeitung, Datenübertragbarkeit und Widerspruch. Soweit eine Verarbeitung auf Einwilligung beruht,
            kannst du diese Einwilligung mit Wirkung für die Zukunft widerrufen. Außerdem besteht ein Beschwerderecht
            bei einer zuständigen Datenschutzaufsichtsbehörde.
          </p>
        </section>

        <section>
          <h2>13. Keine automatisierten Entscheidungen</h2>
          <p>
            Es findet keine automatisierte Entscheidungsfindung einschließlich Profiling statt. Wartelisten- und
            Zahlungsstatus dienen ausschließlich der organisatorischen Abwicklung des Treffens.
          </p>
        </section>

        <p className="legal-backlink">
          <Link href="/">Zurück zur Startseite</Link>
        </p>
      </article>
    </main>
  );
}
