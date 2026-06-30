import Link from "next/link";
import { Beer, CalendarDays, Clock, Euro, MapPin, ReceiptText, Users } from "lucide-react";
import { StatusBadge } from "@/components/status-badge";
import { beerCrateLabel, bookingModeLabels, bookingPaymentState, bookingPaymentSummary, bookingPeriod, paymentLines } from "@/lib/booking-summary";
import { formatCurrency, formatDate, formatExpectedArrival, formatParticipantCount } from "@/lib/format";
import type { BookingRecord, EventRecord, ProfileRecord } from "@/lib/types";

export function BookingConfirmation({
  event,
  booking,
  profile
}: {
  event: EventRecord;
  booking: BookingRecord;
  profile: ProfileRecord | null;
}) {
  const payment = paymentLines(event);
  const paymentState = bookingPaymentState(booking);

  return (
    <section className="booking-confirmation">
      <div className="confirmation-hero panel">
        <div>
          <p className="muted">Buchungsbestätigung für {profile?.first_name || "dich"}</p>
          <h2>{event.subject || event.name}</h2>
          <p>{event.public_summary}</p>
        </div>
        <StatusBadge status={booking.status} />
      </div>

      <div className="confirmation-grid">
        <article className="panel">
          <CalendarDays />
          <h2>Zeitraum</h2>
          <p>{bookingPeriod(booking)}</p>
          <p className="small-text">
            Treffen: {formatDate(event.starts_on)} bis {formatDate(event.ends_on)}
          </p>
        </article>
        <article className="panel">
          <Clock />
          <h2>Ankunft</h2>
          <p>{formatExpectedArrival(booking.expected_arrival_at)}</p>
          <p className="small-text">Ungefähr reicht. Du kannst die Buchung später ändern.</p>
        </article>
        <article className="panel">
          <Users />
          <h2>Teilnahme</h2>
          <p>{bookingModeLabels[booking.mode]}</p>
          <p className="small-text">{formatParticipantCount(booking.participant_count)}</p>
        </article>
        <article className="panel">
          <Beer />
          <h2>Bierkastenpflicht</h2>
          <p>{beerCrateLabel(booking.participant_count)}</p>
          <p className="small-text">{booking.beer_crate_region || "Region noch offen"}</p>
        </article>
        <article className="panel">
          <Euro />
          <h2>Betrag</h2>
          <p className="confirmation-amount">{formatCurrency(booking.amount_cents)}</p>
          <p className="small-text">{bookingPaymentSummary(booking)}</p>
          {paymentState.remainingCents > 0 ? (
            <p className="payment-balance payment-balance-due">Noch offen: {formatCurrency(paymentState.remainingCents)}</p>
          ) : null}
          {paymentState.refundCents > 0 ? (
            <p className="payment-balance payment-balance-refund">
              Rückerstattung / Guthaben: {formatCurrency(paymentState.refundCents)}
            </p>
          ) : null}
        </article>
      </div>

      <div className="confirmation-layout">
        <article className="panel">
          <ReceiptText />
          <h2>Zahlungsdaten</h2>
          {paymentState.remainingCents > 0 && payment.length ? (
            <div className="payment-list">
              {event.payment_iban ? <p>IBAN: {event.payment_iban}</p> : null}
              {event.payment_paypal_url ? (
                <p>
                  PayPal: <a href={event.payment_paypal_url}>{event.payment_paypal_url}</a>
                </p>
              ) : null}
              {event.payment_note ? <p>{event.payment_note}</p> : null}
            </div>
          ) : paymentState.refundCents > 0 ? (
            <p>Du hast mehr bezahlt als die aktuelle Buchung kostet. Der Betrag wird im Adminbereich als Guthaben sichtbar.</p>
          ) : booking.status === "paid" ? (
            <p>Die Zahlung ist vollständig verbucht.</p>
          ) : (
            <p>Die Zahlungsdaten findest du im Mitgliederbereich.</p>
          )}
        </article>

        <article className="panel">
          <MapPin />
          <h2>Ort</h2>
          <p>{event.location_label}</p>
          {event.location_address ? <p className="small-text">{event.location_address}</p> : null}
          <Link className="button secondary small panel-action" href="/location">
            Ort ansehen
          </Link>
        </article>
      </div>

      <div className="quick-actions confirmation-actions">
        <Link className="button secondary" href="/book?bearbeiten=1">
          Buchung ändern
        </Link>
        <Link className="button primary" href="/dashboard">
          Zum Mitgliederbereich
        </Link>
        <Link className="button secondary" href="/gallery">
          Galerie öffnen
        </Link>
      </div>
    </section>
  );
}
