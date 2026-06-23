import Link from "next/link";
import { Beer, CalendarDays, Images, LockKeyhole, MapPin, ShieldCheck, Sprout } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { formatCurrency, formatDate } from "@/lib/format";
import { getActiveEventPublic } from "@/lib/data";

export const dynamic = "force-dynamic";

export default async function HomePage() {
  const event = await getActiveEventPublic();

  return (
    <main className="landing-shell">
      <BrandHeader />

      <section className="hero-section">
        <div className="hero-copy">
          <h1>Stimme-Staemme Treffen {event.year}</h1>
          <p>{event.public_summary}</p>
          <div className="hero-actions">
            <Link className="button primary" href="/auth/register">
              <Sprout size={18} /> Jetzt registrieren
            </Link>
            <Link className="button secondary" href="/auth/login">
              <LockKeyhole size={18} /> Mitgliederbereich
            </Link>
          </div>
          <dl className="hero-facts">
            <div>
              <dt>Wann</dt>
              <dd>
                {formatDate(event.starts_on)} bis {formatDate(event.ends_on)}
              </dd>
            </div>
            <div>
              <dt>Limit</dt>
              <dd>{event.member_limit} Gurken</dd>
            </div>
            <div>
              <dt>Ab</dt>
              <dd>{formatCurrency(event.day_guest_price_cents)}</dd>
            </div>
          </dl>
        </div>
        <div className="hero-art" aria-hidden="true">
          <img className="hero-wappen" src="/assets/stammeswappen.png" alt="" />
          <img className="hero-chungus" src="/assets/chungus.png" alt="" />
        </div>
      </section>

      <section className="feature-band">
        <article>
          <CalendarDays />
          <h2>Buchung mit Zeitraum</h2>
          <p>Mit Uebernachtung pro Nacht oder als Tagesgast mit sofort sichtbarem Betrag.</p>
        </article>
        <article>
          <Beer />
          <h2>Bierkastenpflicht</h2>
          <p>Jede Person bringt einen Kasten aus der eigenen Region mit. Das System fragt die Region ab.</p>
        </article>
        <article>
          <Images />
          <h2>Live-Galerie</h2>
          <p>Fotos koennen vor Ort direkt hochgeladen und als Slideshow an den Beamer geworfen werden.</p>
        </article>
      </section>

      <section className="info-section">
        <div>
          <h2>Was nach dem Login passiert</h2>
          <p>
            Nach Mailverifizierung fuehrt dich das Onboarding durch Name, Vorname und Wohnort. Danach siehst du den
            genauen Ort, deine Zahlungsinfos und den Mitgliederbereich.
          </p>
        </div>
        <div className="info-list">
          <p>
            <ShieldCheck size={18} /> E-Mail-Verifizierung und Turnstile schuetzen die Registrierung.
          </p>
          <p>
            <MapPin size={18} /> Der genaue Treffpunkt ist erst im Mitgliederbereich sichtbar.
          </p>
          <p>
            <Sprout size={18} /> Admins pflegen Preise, Limit, Warteliste und Zahlungsstatus.
          </p>
        </div>
      </section>
    </main>
  );
}
