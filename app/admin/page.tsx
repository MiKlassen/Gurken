import Image from "next/image";
import Link from "next/link";
import {
  addAdminAction,
  confirmBookingAction,
  deleteRoomAction,
  encryptExistingPersonalDataAction,
  promoteMemberToAdminAction,
  saveAppSettingsAction,
  saveEmailTemplatesAction,
  saveEventAction,
  saveLocationSettingsAction,
  saveRoomAction,
  updateBookingStatusAction
} from "@/app/actions/admin";
import { BrandHeader } from "@/components/brand-header";
import { StatusBadge } from "@/components/status-badge";
import { SubmitButton } from "@/components/submit-button";
import { getAppSettings, getSecretConfigStatus } from "@/lib/app-settings";
import { bookingPaymentState } from "@/lib/booking-summary";
import { demoEvent, getAdminOverview, requireAdmin } from "@/lib/data";
import { getEmailTemplates, templatePlaceholderHelp } from "@/lib/email-templates";
import { formatCurrency, formatDate, formatDateTime, formatParticipantCount } from "@/lib/format";
import type { BookingMode, BookingRecord, BookingStatus } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;
type AdminSection = "buchungen" | "mitglieder" | "event" | "ort" | "admins" | "mails" | "einstellungen";

const adminSections: { id: AdminSection; label: string }[] = [
  { id: "buchungen", label: "Buchungen" },
  { id: "mitglieder", label: "Mitglieder" },
  { id: "event", label: "Event" },
  { id: "ort", label: "Ortseinstellungen" },
  { id: "admins", label: "Admins" },
  { id: "mails", label: "E-Mails" },
  { id: "einstellungen", label: "Einstellungen" }
];

const bookingStatusOptions: { value: BookingStatus; label: string }[] = [
  { value: "pending_payment", label: "Zahlung offen" },
  { value: "paid", label: "Bestätigt / bezahlt" },
  { value: "waitlisted", label: "Warteliste" },
  { value: "cancelled", label: "Storniert" }
];

const bookingModeLabels: Record<BookingMode, string> = {
  overnight: "Übernachtung",
  day_guest: "Tagesgast"
};

function secretStateLabel(value: boolean) {
  return value ? "gesetzt" : "fehlt";
}

function getAdminSection(value: string | string[] | undefined): AdminSection {
  const section = typeof value === "string" ? value : "";
  return adminSections.some((entry) => entry.id === section) ? (section as AdminSection) : "buchungen";
}

function bookingPeriod(booking: BookingRecord) {
  if (booking.mode === "overnight") {
    return `${formatDate(booking.arrival_date)} bis ${formatDate(booking.departure_date)}`;
  }

  return (booking.day_guest_dates || []).map(formatDate).join(", ") || "offen";
}

function expectedArrival(value: string | null | undefined) {
  return value ? formatDateTime(value) : "offen";
}

export default async function AdminPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const activeSection = getAdminSection(params.bereich);
  const error = typeof params.error === "string" ? params.error : "";
  const message = typeof params.message === "string" ? params.message : "";
  const [{ events, bookings, profiles, adminMemberships, rooms }, appSettings, mailTemplates] = await Promise.all([
    getAdminOverview(),
    getAppSettings(),
    getEmailTemplates()
  ]);
  const secretStatus = getSecretConfigStatus();
  const activeEvent = events.find((event) => event.is_active) || events[0] || demoEvent;
  const occupiedSlots = bookings
    .filter((booking) => booking.status === "pending_payment" || booking.status === "paid")
    .reduce((sum, booking) => sum + (booking.participant_count || 1), 0);
  const paidBookings = bookings.filter((booking) => booking.status === "paid");
  const pendingBookings = bookings.filter((booking) => booking.status === "pending_payment");
  const waitlistedBookings = bookings.filter((booking) => booking.status === "waitlisted");
  const bookingByUser = new Map(bookings.map((booking) => [booking.user_id, booking]));
  const adminUserIds = new Set(adminMemberships.map((membership) => membership.user_id));
  const paidAmountTotal = bookings.reduce((sum, booking) => sum + (booking.paid_amount_cents || 0), 0);
  const openBalanceTotal = bookings.reduce((sum, booking) => sum + bookingPaymentState(booking).remainingCents, 0);
  const refundTotal = bookings.reduce((sum, booking) => sum + bookingPaymentState(booking).refundCents, 0);
  const activeRooms = rooms.filter((room) => room.event_id === activeEvent.id);
  const totalBeds = activeRooms.reduce((sum, room) => sum + room.bed_count, 0);

  return (
    <main className="app-shell admin-shell">
      <BrandHeader isAuthed isAdmin />
      <section className="page-heading">
        <Image src="/assets/bierkapitaen.png" alt="" width={76} height={76} />
        <div>
          <h1>Admin-Konsole</h1>
          <p>Treffen planen, Buchungen prüfen, Zahlung markieren und Admins setzen.</p>
        </div>
      </section>
      {error ? <p className="notice error">{error}</p> : null}
      {message ? <p className="notice success">{message}</p> : null}

      <nav className="admin-tabs" aria-label="Admin-Unterpunkte">
        {adminSections.map((section) => (
          <Link
            key={section.id}
            className={section.id === activeSection ? "active" : ""}
            href={`/admin?bereich=${section.id}`}
          >
            {section.label}
          </Link>
        ))}
      </nav>

      {activeSection === "buchungen" ? (
      <section className="panel table-panel">
        <div className="section-title-row">
          <div>
            <h2>Buchungsübersicht</h2>
            <p className="small-text">Alle aktuellen Buchungen mit Personen, Betrag, Zeitraum und Zahlungsstatus.</p>
          </div>
          <div className="admin-metrics" aria-label="Buchungskennzahlen">
            <span>{bookings.length} Buchungen</span>
            <span>{occupiedSlots} / {activeEvent.member_limit} Plätze</span>
            <span>{paidBookings.length} bestätigt</span>
            <span>{pendingBookings.length} offen</span>
            <span>{waitlistedBookings.length} Warteliste</span>
          </div>
        </div>
        <div className="table-wrap">
          <table>
            <thead>
              <tr>
                <th>Mitglied</th>
                <th>Buchung</th>
                <th>Personen</th>
                <th>Zeitraum</th>
                <th>Bierkasten</th>
                <th>Betrag</th>
                <th>Bezahlt</th>
                <th>Saldo</th>
                <th>Status</th>
                <th>Reminder</th>
                <th>Eingang</th>
                <th>Bearbeiten</th>
              </tr>
            </thead>
            <tbody>
              {bookings.length ? (
                bookings.map((booking) => {
                  const paymentState = bookingPaymentState(booking);

                  return (
                  <tr key={booking.id}>
                    <td>
                      {booking.profiles?.first_name || "?"} {booking.profiles?.last_name || ""}
                      <br />
                      <span>
                        {booking.profiles?.postal_code || ""} {booking.profiles?.city || booking.profiles?.hometown || "Anschrift offen"}
                      </span>
                    </td>
                    <td>{bookingModeLabels[booking.mode]}</td>
                    <td>{formatParticipantCount(booking.participant_count)}</td>
                    <td>{bookingPeriod(booking)}</td>
                    <td>{booking.beer_crate_region || "offen"}</td>
                    <td>{formatCurrency(booking.amount_cents)}</td>
                    <td>{booking.paid_amount_cents ? formatCurrency(booking.paid_amount_cents) : "-"}</td>
                    <td>
                      {paymentState.remainingCents ? (
                        <span className="payment-balance payment-balance-due">{formatCurrency(paymentState.remainingCents)} offen</span>
                      ) : paymentState.refundCents ? (
                        <span className="payment-balance payment-balance-refund">
                          {formatCurrency(paymentState.refundCents)} Guthaben
                        </span>
                      ) : (
                        <span className="payment-balance payment-balance-ok">ausgeglichen</span>
                      )}
                    </td>
                    <td>
                      <StatusBadge status={booking.status} />
                    </td>
                    <td>
                      {booking.payment_reminder_count ? `${booking.payment_reminder_count}x` : "Noch keiner"}
                      {booking.payment_reminder_sent_at ? (
                        <>
                          <br />
                          <span>{formatDateTime(booking.payment_reminder_sent_at)}</span>
                        </>
                      ) : null}
                    </td>
                    <td>{formatDateTime(booking.created_at)}</td>
                    <td>
                      <div className="booking-actions">
                        {booking.status !== "paid" && booking.status !== "cancelled" ? (
                          <form action={confirmBookingAction}>
                            <input type="hidden" name="bookingId" value={booking.id} />
                            <SubmitButton className="button primary small" pendingLabel="Bestätigt...">
                              Bestätigen
                            </SubmitButton>
                          </form>
                        ) : null}
                        <form className="status-form" action={updateBookingStatusAction}>
                          <input type="hidden" name="bookingId" value={booking.id} />
                          <select name="status" defaultValue={booking.status} aria-label="Buchungsstatus">
                            {bookingStatusOptions.map((status) => (
                              <option key={status.value} value={status.value}>
                                {status.label}
                              </option>
                            ))}
                          </select>
                          <SubmitButton className="button secondary small" pendingLabel="Speichert...">
                            Speichern
                          </SubmitButton>
                        </form>
                      </div>
                    </td>
                  </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={12}>Noch keine Buchungen.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      ) : null}

      {activeSection === "mitglieder" ? (
      <section className="panel table-panel">
        <div className="section-title-row">
          <div>
            <h2>Mitglieder</h2>
            <p className="small-text">Profile mit aktueller Buchung für das aktive Treffen.</p>
          </div>
          <div className="admin-metrics" aria-label="Mitgliederkennzahlen">
            <span>{profiles.length} Profile</span>
            <span>{adminUserIds.size} Admins</span>
          </div>
        </div>
        <div className="table-wrap">
          <table className="members-table">
            <thead>
              <tr>
                <th>Name</th>
                <th>Anschrift</th>
                <th>Ankunft</th>
                <th>Buchung</th>
                <th>Personen</th>
                <th>Status</th>
                <th>Betrag</th>
                <th>Rolle</th>
                <th>Admin</th>
              </tr>
            </thead>
            <tbody>
              {profiles.length ? (
                profiles.map((profile) => {
                  const booking = bookingByUser.get(profile.user_id);
                  const isAdmin = adminUserIds.has(profile.user_id);

                  return (
                    <tr key={profile.user_id}>
                      <td>
                        {profile.first_name || "?"} {profile.last_name || ""}
                      </td>
                      <td>
                        {profile.street_address ? (
                          <>
                            {profile.street_address}
                            <br />
                          </>
                        ) : null}
                        {profile.postal_code || profile.city ? `${profile.postal_code || ""} ${profile.city || ""}`.trim() : profile.hometown || "offen"}
                      </td>
                      <td>{expectedArrival(profile.expected_arrival_at)}</td>
                      <td>{booking ? bookingModeLabels[booking.mode] : "Keine Buchung"}</td>
                      <td>{booking ? formatParticipantCount(booking.participant_count) : "-"}</td>
                      <td>{booking ? <StatusBadge status={booking.status} /> : "-"}</td>
                      <td>{booking ? formatCurrency(booking.amount_cents) : "-"}</td>
                      <td>
                        <span className={isAdmin ? "role-pill role-pill-admin" : "role-pill"}>
                          {isAdmin ? "Admin" : "Mitglied"}
                        </span>
                      </td>
                      <td>
                        {isAdmin ? (
                          <span className="small-text">Bereits Admin</span>
                        ) : (
                          <form action={promoteMemberToAdminAction}>
                            <input type="hidden" name="userId" value={profile.user_id} />
                            <SubmitButton className="button secondary small" pendingLabel="Setzt...">
                              Als Admin setzen
                            </SubmitButton>
                          </form>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={9}>Noch keine Mitgliederprofile.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
      ) : null}

      {activeSection === "event" ? (
      <section className="admin-grid admin-grid-single">
        <form className="form-panel admin-form" action={saveEventAction}>
          <h2>Event konfigurieren</h2>
          <p className="form-hint">Startdatum, Enddatum und Preise steuern den Buchungszeitraum und die Betragsberechnung.</p>
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
              Betreff
              <input name="subject" defaultValue={activeEvent.subject || activeEvent.name} required />
            </label>
            <label>
              Slug
              <input name="slug" defaultValue={activeEvent.slug} required />
            </label>
            <label className="checkbox-line">
              <input name="isActive" type="checkbox" defaultChecked={activeEvent.is_active} /> Aktiv
            </label>
            <label>
              Startdatum
              <input name="startsOn" type="date" defaultValue={activeEvent.starts_on} required />
            </label>
            <label>
              Enddatum
              <input name="endsOn" type="date" defaultValue={activeEvent.ends_on} required />
            </label>
            <label>
              Limit
              <input name="memberLimit" type="number" min={1} defaultValue={activeEvent.member_limit} required />
            </label>
            <label>
              Preis pro Nacht
              <input
                name="overnightPrice"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                defaultValue={(activeEvent.overnight_price_cents / 100).toFixed(2)}
                required
              />
            </label>
            <label>
              Preis pro Tag
              <input
                name="dayGuestPrice"
                type="number"
                inputMode="decimal"
                min="0"
                step="0.01"
                defaultValue={(activeEvent.day_guest_price_cents / 100).toFixed(2)}
                required
              />
            </label>
          </div>
          <label>
            Landingpage-Text
            <textarea name="publicSummary" defaultValue={activeEvent.public_summary} rows={3} />
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
      </section>
      ) : null}

      {activeSection === "ort" ? (
      <section className="admin-grid admin-grid-single">
        <form className="form-panel admin-form" action={saveLocationSettingsAction}>
          <div className="section-title-row">
            <div>
              <h2>Ortseinstellungen</h2>
              <p className="form-hint">Adresse, Ortslink, genaue Hinweise und Zusatzfelder für den Mitgliederbereich.</p>
            </div>
            <div className="admin-metrics" aria-label="Zimmerkennzahlen">
              <span>{activeRooms.length} Zimmer</span>
              <span>{totalBeds} Betten</span>
            </div>
          </div>
          <input type="hidden" name="eventId" value={activeEvent.id !== "demo" ? activeEvent.id : ""} />
          <label>
            Ortslabel
            <input name="locationLabel" defaultValue={activeEvent.location_label} />
          </label>
          <label>
            Adresse
            <textarea name="locationAddress" defaultValue={activeEvent.location_address || ""} rows={3} placeholder="Straße, Hausnummer, PLZ, Ort" />
          </label>
          <label>
            Ortslink
            <input name="locationUrl" type="url" defaultValue={activeEvent.location_url || ""} placeholder="https://maps.google.com/..." />
          </label>
          <label>
            Genaue Ortsinfos
            <textarea name="locationDetails" defaultValue={activeEvent.location_details} rows={4} />
          </label>
          <div className="form-grid two">
            <label>
              Zusatzfeld 1 Label
              <input name="locationMetaLabel1" defaultValue={activeEvent.location_meta_label_1 || ""} placeholder="z.B. Parken" />
            </label>
            <label>
              Zusatzfeld 1 Wert
              <input name="locationMetaValue1" defaultValue={activeEvent.location_meta_value_1 || ""} placeholder="z.B. Innenhof nutzen" />
            </label>
            <label>
              Zusatzfeld 2 Label
              <input name="locationMetaLabel2" defaultValue={activeEvent.location_meta_label_2 || ""} placeholder="z.B. Anreise" />
            </label>
            <label>
              Zusatzfeld 2 Wert
              <input name="locationMetaValue2" defaultValue={activeEvent.location_meta_value_2 || ""} placeholder="z.B. Bahnhof 12 Minuten entfernt" />
            </label>
          </div>
          <SubmitButton>Ort speichern</SubmitButton>
        </form>

        <section className="panel room-management">
          <div className="section-title-row">
            <div>
              <h2>Zimmer</h2>
              <p className="small-text">Zimmer und Betten bilden die Grundlage für den Zimmerbelegungsplan.</p>
            </div>
          </div>
          <form className="room-create-form" action={saveRoomAction}>
            <input type="hidden" name="eventId" value={activeEvent.id !== "demo" ? activeEvent.id : ""} />
            <div className="form-grid three">
              <label>
                Zimmername
                <input name="roomName" placeholder="z.B. Dachzimmer" required />
              </label>
              <label>
                Betten
                <input name="bedCount" type="number" min={1} max={100} defaultValue={1} required />
              </label>
              <label>
                Sortierung
                <input name="sortOrder" type="number" min={0} max={10000} defaultValue={activeRooms.length * 10} />
              </label>
            </div>
            <div className="form-grid two">
              <label>
                Notiz
                <input name="roomNotes" placeholder="z.B. ruhig, Obergeschoss, eigenes Bad" />
              </label>
              <label className="checkbox-line">
                <input name="isMultiBed" type="checkbox" defaultChecked /> Mehrbettzimmer
              </label>
            </div>
            <SubmitButton className="button secondary">Zimmer anlegen</SubmitButton>
          </form>

          {activeRooms.length ? (
            <div className="room-card-grid">
              {activeRooms.map((room) => (
                <article className="room-card" key={room.id}>
                  <form className="room-card-form" action={saveRoomAction}>
                    <input type="hidden" name="eventId" value={activeEvent.id} />
                    <input type="hidden" name="roomId" value={room.id} />
                    <div className="form-grid two">
                      <label>
                        Zimmername
                        <input name="roomName" defaultValue={room.name} required />
                      </label>
                      <label>
                        Betten
                        <input name="bedCount" type="number" min={1} max={100} defaultValue={room.bed_count} required />
                      </label>
                      <label>
                        Sortierung
                        <input name="sortOrder" type="number" min={0} max={10000} defaultValue={room.sort_order} />
                      </label>
                      <label className="checkbox-line">
                        <input name="isMultiBed" type="checkbox" defaultChecked={room.is_multi_bed} /> Mehrbettzimmer
                      </label>
                    </div>
                    <label>
                      Notiz
                      <textarea name="roomNotes" defaultValue={room.notes || ""} rows={2} />
                    </label>
                    <div className="room-card-actions">
                      <SubmitButton className="button secondary small" pendingLabel="Speichert...">
                        Speichern
                      </SubmitButton>
                    </div>
                  </form>
                  <form action={deleteRoomAction}>
                    <input type="hidden" name="eventId" value={activeEvent.id} />
                    <input type="hidden" name="roomId" value={room.id} />
                    <SubmitButton className="button ghost small" pendingLabel="Löscht...">
                      Zimmer löschen
                    </SubmitButton>
                  </form>
                </article>
              ))}
            </div>
          ) : (
            <p className="notice-inline">Noch keine Zimmer angelegt.</p>
          )}
        </section>
      </section>
      ) : null}

      {activeSection === "admins" ? (
      <section className="admin-grid admin-grid-single">
        <div className="panel admin-side">
          <h2>Admins</h2>
          <form className="inline-reset" action={addAdminAction}>
            <input name="email" type="email" placeholder="mail@example.com" required />
            <SubmitButton className="button secondary small" pendingLabel="Fügt hinzu...">
              Hinzufügen
            </SubmitButton>
          </form>
          <form action={encryptExistingPersonalDataAction}>
            <SubmitButton className="button secondary small" pendingLabel="Verschlüsselt...">
              Bestehende personenbezogene Felder verschlüsseln
            </SubmitButton>
          </form>
          <h2>Mitglieder</h2>
          <p>{profiles.length} Profile im System</p>
          <h2>Belegte Plätze</h2>
          <p>
            {occupiedSlots} von {activeEvent.member_limit}
          </p>
          <h2>Umsatz-Snapshot</h2>
          <p>{formatCurrency(paidAmountTotal)} bestätigt bezahlt</p>
          <p className="small-text">{formatCurrency(openBalanceTotal)} offen</p>
          <p className="small-text">{formatCurrency(refundTotal)} Guthaben / Rückerstattung</p>
        </div>
      </section>
      ) : null}

      {activeSection === "einstellungen" ? (
      <section className="admin-grid admin-grid-single">
        <form className="form-panel admin-form settings-form" action={saveAppSettingsAction}>
          <div className="section-title-row settings-title-row">
            <div>
              <h2>Systemeinstellungen</h2>
              <p className="form-hint">Nicht-geheime Werte werden in Supabase gespeichert und schlagen Env-Fallbacks.</p>
            </div>
            <div className="secret-status-grid" aria-label="Secret-Status">
              <span className={secretStatus.cronSecret ? "role-pill role-pill-admin" : "role-pill"}>CRON_SECRET {secretStateLabel(secretStatus.cronSecret)}</span>
              <span className={secretStatus.smtpUser ? "role-pill role-pill-admin" : "role-pill"}>SMTP_USER {secretStateLabel(secretStatus.smtpUser)}</span>
              <span className={secretStatus.smtpPassword ? "role-pill role-pill-admin" : "role-pill"}>SMTP_PASSWORD {secretStateLabel(secretStatus.smtpPassword)}</span>
            </div>
          </div>

          <h3>SMTP</h3>
          <div className="form-grid three">
            <label>
              SMTP-Host
              <input name="smtpHost" defaultValue={appSettings.smtpHost} placeholder="smtp.example.com" />
            </label>
            <label>
              SMTP-Port
              <input name="smtpPort" type="number" min={1} max={65535} defaultValue={appSettings.smtpPort} />
            </label>
            <label>
              Timeout ms
              <input name="smtpTimeoutMs" type="number" min={1000} max={120000} step={1000} defaultValue={appSettings.smtpTimeoutMs} />
            </label>
            <label>
              Absender
              <input name="smtpFrom" defaultValue={appSettings.smtpFrom} placeholder="Gurken Treffen <noreply@gurken.family>" required />
            </label>
            <label>
              Reply-To
              <input name="smtpReplyTo" defaultValue={appSettings.smtpReplyTo} placeholder="optional" />
            </label>
            <label className="checkbox-line">
              <input name="smtpSecure" type="checkbox" defaultChecked={appSettings.smtpSecure} /> TLS direkt
            </label>
            <label className="checkbox-line">
              <input name="smtpStartTls" type="checkbox" defaultChecked={appSettings.smtpStartTls} /> STARTTLS
            </label>
          </div>

          <h3>Reminder</h3>
          <div className="form-grid three">
            <label className="checkbox-line">
              <input name="paymentRemindersEnabled" type="checkbox" defaultChecked={appSettings.paymentRemindersEnabled} /> Zahlungsreminder aktiv
            </label>
            <label>
              Intervall Tage
              <input
                name="paymentReminderIntervalDays"
                type="number"
                min={1}
                max={365}
                defaultValue={appSettings.paymentReminderIntervalDays}
              />
            </label>
            <label>
              Batchgröße
              <input name="paymentReminderBatchSize" type="number" min={1} max={100} defaultValue={appSettings.paymentReminderBatchSize} />
            </label>
          </div>

          <h3>Cron</h3>
          <div className="form-grid two">
            <label className="checkbox-line">
              <input name="paymentReminderCronEnabled" type="checkbox" defaultChecked={appSettings.paymentReminderCronEnabled} /> Cron aktiv
            </label>
          </div>

          <p className="legal-note">
            SMTP_USER, SMTP_PASSWORD und CRON_SECRET bleiben serverseitige Environment Variables und werden hier nicht gespeichert.
          </p>
          <SubmitButton>Systemeinstellungen speichern</SubmitButton>
        </form>
      </section>
      ) : null}

      {activeSection === "mails" ? (
      <section className="admin-grid admin-grid-single">
        <form className="form-panel admin-form mail-template-form" action={saveEmailTemplatesAction}>
          <div className="section-title-row settings-title-row">
            <div>
              <h2>E-Mail-Templates</h2>
              <p className="form-hint">Diese Vorlagen werden für Buchungsbestätigung und Zahlungsreminder genutzt.</p>
            </div>
          </div>
          <p className="legal-note">
            Platzhalter: {templatePlaceholderHelp.map((placeholder) => `{{${placeholder}}}`).join(", ")}
          </p>

          {mailTemplates.map((template) => (
            <fieldset className="mail-template-editor" key={template.key}>
              <legend>{template.name}</legend>
              <label>
                Betreff
                <input name={`${template.key}_subject`} defaultValue={template.subject} required />
              </label>
              <label>
                Text-Version
                <textarea name={`${template.key}_text`} defaultValue={template.text_body} rows={10} required />
              </label>
              <label>
                HTML-Version
                <textarea name={`${template.key}_html`} defaultValue={template.html_body} rows={12} required />
              </label>
            </fieldset>
          ))}

          <SubmitButton>E-Mail-Templates speichern</SubmitButton>
        </form>
      </section>
      ) : null}
    </main>
  );
}
