import { addAdminAction, saveEventAction, updateBookingStatusAction } from "@/app/actions/admin";
import { BrandHeader } from "@/components/brand-header";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { demoEvent, getAdminOverview, requireAdmin } from "@/lib/data";
import { formatCurrency, formatDate } from "@/lib/format";
import type { BookingStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const message = typeof params.message === "string" ? params.message : "";
  const { events, bookings, profiles } = await getAdminOverview();
  const activeEvent = events.find((event) => event.is_active) || events[0] || demoEvent;

  return (
    <main className="app-shell admin-shell">
      <BrandHeader isAuthed isAdmin />
      <section className="page-heading">
        <img src="/assets/bierkapitaen.png" alt="" />
        <div>
          <h1>Admin-Konsole</h1>
          <p>Treffen planen, Buchungen pruefen, Zahlung markieren und Admins setzen.</p>
        </div>
      </section>
      {error ? <p className="notice error">{error}</p> : null}
      {message ? <p className="notice success">{message}</p> : null}

      <section className="admin-grid">
        <form className="form-panel admin-form" action={saveEventAction}>
          <h2>Aktives Treffen</h2>
          {activeEvent.id !== "demo" ? <input type="hidden" name="eventId" value={activeEvent.id} /> : null}
          <div className="form-grid two">
            <label>
              Jahr
              <input name="year" type="number" defaultValue={activeEvent.year} required />
            </label>
            <label>
              Name
              <input name="name" defaultValue={activeEvent.name} required />
            </label>
            <label>
              Slug
              <input name="slug" defaultValue={activeEvent.slug} required />
            </label>
            <label className="checkbox-line">
              <input name="isActive" type="checkbox" defaultChecked={activeEvent.is_active} /> Aktiv
            </label>
            <label>
              Start
              <input name="startsOn" type="date" defaultValue={activeEvent.starts_on} required />
            </label>
            <label>
              Ende
              <input name="endsOn" type="date" defaultValue={activeEvent.ends_on} required />
            </label>
            <label>
              Limit
              <input name="memberLimit" type="number" min={1} defaultValue={activeEvent.member_limit} required />
            </label>
            <label>
              Preis pro Nacht
              <input name="overnightPrice" inputMode="decimal" defaultValue={(activeEvent.overnight_price_cents / 100).toFixed(2)} required />
            </label>
            <label>
              Tagesgastpreis
              <input name="dayGuestPrice" inputMode="decimal" defaultValue={(activeEvent.day_guest_price_cents / 100).toFixed(2)} required />
            </label>
          </div>
          <label>
            Landingpage-Text
            <textarea name="publicSummary" defaultValue={activeEvent.public_summary} rows={3} />
          </label>
          <label>
            Ortslabel
            <input name="locationLabel" defaultValue={activeEvent.location_label} />
          </label>
          <label>
            Genaue Ortsinfos
            <textarea name="locationDetails" defaultValue={activeEvent.location_details} rows={4} />
          </label>
          <div className="form-grid two">
            <label>
              IBAN
              <input name="paymentIban" defaultValue={activeEvent.payment_iban || ""} />
            </label>
            <label>
              PayPal.me
              <input name="paymentPaypalUrl" defaultValue={activeEvent.payment_paypal_url || ""} />
            </label>
          </div>
          <label>
            Zahlungshinweis
            <textarea name="paymentNote" defaultValue={activeEvent.payment_note || ""} rows={2} />
          </label>
          <SubmitButton>Treffen speichern</SubmitButton>
        </form>

        <div className="panel admin-side">
          <h2>Admins</h2>
          <form className="inline-reset" action={addAdminAction}>
            <input name="email" type="email" placeholder="mail@example.com" required />
            <SubmitButton className="button secondary small" pendingLabel="Fuegt hinzu...">
              Hinzufuegen
            </SubmitButton>
          </form>
          <h2>Mitglieder</h2>
          <p>{profiles.length} Profile im System</p>
          <h2>Umsatz-Snapshot</h2>
          <p>{formatCurrency(bookings.filter((booking) => booking.status === "paid").reduce((sum, booking) => sum + booking.amount_cents, 0))}</p>
        </div>
      </section>

      <section className="panel table-panel">
        <h2>Buchungen</h2>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Name</th>
                <th>Modus</th>
                <th>Zeitraum</th>
                <th>Betrag</th>
                <th>Status</th>
                <th>Aktion</th>
              </tr>
            </thead>
            <tbody>
              {bookings.map((booking) => (
                <tr key={booking.id}>
                  <td>
                    {booking.profiles?.first_name || "?"} {booking.profiles?.last_name || ""}
                    <br />
                    <span>{booking.profiles?.hometown || "Wohnort offen"}</span>
                  </td>
                  <td>{booking.mode === "overnight" ? "Uebernachtung" : "Tagesgast"}</td>
                  <td>
                    {booking.mode === "overnight"
                      ? `${formatDate(booking.arrival_date)} - ${formatDate(booking.departure_date)}`
                      : (booking.day_guest_dates || []).map(formatDate).join(", ")}
                  </td>
                  <td>{formatCurrency(booking.amount_cents)}</td>
                  <td>
                    <StatusBadge status={booking.status} />
                  </td>
                  <td>
                    <form className="status-form" action={updateBookingStatusAction}>
                      <input type="hidden" name="bookingId" value={booking.id} />
                      <select name="status" defaultValue={booking.status}>
                        {(["pending_payment", "paid", "waitlisted", "cancelled"] satisfies BookingStatus[]).map((status) => (
                          <option key={status} value={status}>
                            {status}
                          </option>
                        ))}
                      </select>
                      <SubmitButton className="button secondary small" pendingLabel="...">
                        Setzen
                      </SubmitButton>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </main>
  );
}
