import Image from "next/image";
import Link from "next/link";
import { Beer, CalendarDays, Euro, Images, MapPin } from "lucide-react";
import { BrandHeader } from "@/components/brand-header";
import { StatusBadge } from "@/components/status-badge";
import {
  getActiveEventForMember,
  getBookingForUser,
  getCurrentProfile,
  getIsAdmin,
  isProfileComplete,
  requireCompleteProfile,
  requireVerifiedUser
} from "@/lib/data";
import { formatCurrency, formatDate, formatParticipantCount } from "@/lib/format";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function DashboardPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireVerifiedUser();
  const profile = await getCurrentProfile(user.id);
  if (!isProfileComplete(profile)) {
    await requireCompleteProfile(user.id);
  }

  const [params, isAdmin, event] = await Promise.all([searchParams, getIsAdmin(user.id, user.email), getActiveEventForMember()]);
  const message = typeof params.message === "string" ? params.message : "";
  const booking = event ? await getBookingForUser(event.id, user.id) : null;

  return (
    <main className="app-shell">
      <BrandHeader isAuthed isAdmin={isAdmin} />
      {message ? <p className="notice success">{message}</p> : null}
      <section className="dashboard-hero">
        <div>
          <p className="muted">Willkommen, {profile?.first_name}</p>
          <h1>{event?.subject || event?.name || "Kein aktives Treffen"}</h1>
          <p>{event?.public_summary}</p>
        </div>
        <Image src="/assets/gurken-rudel.png" alt="" width={360} height={260} priority />
      </section>

      {event ? (
        <section className="dashboard-grid">
          <article className="panel">
            <CalendarDays />
            <h2>Zeitraum</h2>
            <p>
              {formatDate(event.starts_on)} bis {formatDate(event.ends_on)}
            </p>
          </article>
          <article className="panel">
            <MapPin />
            <h2>Ort</h2>
            <p>{event.location_label}</p>
            {event.location_address ? <p className="small-text">{event.location_address}</p> : null}
            <p className="small-text">{event.location_details}</p>
            <Link className="button secondary small panel-action" href="/location">
              Ort ansehen
            </Link>
          </article>
          <article className="panel">
            <Beer />
            <h2>Bierkastenpflicht</h2>
            {booking ? <p>{formatParticipantCount(booking.participant_count)}</p> : null}
            <p>{booking?.beer_crate_region ? `Deine Region: ${booking.beer_crate_region}` : "Region noch offen."}</p>
          </article>
          <article className="panel">
            <Euro />
            <h2>Zahlung</h2>
            {booking ? (
              <>
                <p>
                  <StatusBadge status={booking.status} /> {formatCurrency(booking.amount_cents)}
                </p>
                {booking.status !== "paid" ? (
                  <div className="payment-box">
                    {event.payment_iban ? <p>IBAN: {event.payment_iban}</p> : null}
                    {event.payment_paypal_url ? (
                      <p>
                        PayPal: <a href={event.payment_paypal_url}>{event.payment_paypal_url}</a>
                      </p>
                    ) : null}
                    {event.payment_note ? <p>{event.payment_note}</p> : null}
                  </div>
                ) : null}
              </>
            ) : (
              <p>Noch keine Buchung.</p>
            )}
          </article>
        </section>
      ) : null}

      <section className="quick-actions">
        <Link className="button primary" href="/book">
          <CalendarDays size={18} /> Buchung bearbeiten
        </Link>
        <Link className="button secondary" href="/location">
          <MapPin size={18} /> Ort ansehen
        </Link>
        <Link className="button secondary" href="/gallery">
          <Images size={18} /> Galerie öffnen
        </Link>
      </section>
    </main>
  );
}
