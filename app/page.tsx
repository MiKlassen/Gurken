import Image from "next/image";
import Link from "next/link";
import { Beer, CalendarDays, Images, LockKeyhole, Sprout } from "lucide-react";
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
          <h1>{event.subject || `${event.name} ${event.year}`}</h1>
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
          <Image className="hero-wappen" src="/assets/stammeswappen.png" alt="" fill priority sizes="(max-width: 900px) 100vw, 42vw" />
          <Image className="hero-chungus" src="/assets/chungus.png" alt="" width={190} height={313} priority />
        </div>
      </section>

      <section className="feature-band">
        <article>
          <CalendarDays />
          <h2>Buchung mit Zeitraum</h2>
          <p>Mit Übernachtung pro Nacht oder als Tagesgast mit sofort sichtbarem Betrag.</p>
        </article>
        <article>
          <Beer />
          <h2>Bierkastenpflicht</h2>
          <p>Jede Person bringt einen Kasten aus der eigenen Region mit. Das System fragt die Region ab.</p>
        </article>
        <article>
          <Images />
          <h2>Live-Galerie</h2>
          <p>Fotos können vor Ort direkt hochgeladen und als Slideshow an den Beamer geworfen werden.</p>
        </article>
      </section>

      <section className="info-section">
        <div>
          <h2>Was nach dem Login passiert</h2>
          <p>
            Nach Mailverifizierung führt dich das Onboarding durch Name, Vorname und Wohnort. Danach siehst du den
            genauen Ort, deine Zahlungsinfos und den Mitgliederbereich.
          </p>
        </div>
      </section>
    </main>
  );
}
