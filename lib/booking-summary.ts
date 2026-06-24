import { escapeHtml } from "@/lib/email-templates";
import { formatCurrency, formatDate, formatParticipantCount } from "@/lib/format";
import type { BookingMode, BookingRecord, BookingStatus, EventRecord, ProfileRecord } from "@/lib/types";

export const bookingModeLabels: Record<BookingMode, string> = {
  overnight: "Übernachtung",
  day_guest: "Tagesgast"
};

export const bookingStatusLabels: Record<BookingStatus, string> = {
  pending_payment: "Zahlung offen",
  paid: "Bezahlt",
  waitlisted: "Warteliste",
  cancelled: "Storniert"
};

export function beerCrateLabel(count: number | null | undefined) {
  const normalized = count || 1;
  return normalized === 1 ? "1 Bierkasten" : `${normalized} Bierkästen`;
}

export function bookingPeriod(booking: Pick<BookingRecord, "mode" | "arrival_date" | "departure_date" | "day_guest_dates">) {
  if (booking.mode === "overnight") {
    return `${formatDate(booking.arrival_date)} bis ${formatDate(booking.departure_date)}`;
  }

  return (booking.day_guest_dates || []).map(formatDate).join(", ") || "offen";
}

export function paymentLines(event: Pick<EventRecord, "payment_iban" | "payment_paypal_url" | "payment_note"> | null) {
  const lines = [];
  if (event?.payment_iban) lines.push(`IBAN: ${event.payment_iban}`);
  if (event?.payment_paypal_url) lines.push(`PayPal: ${event.payment_paypal_url}`);
  if (event?.payment_note) lines.push(event.payment_note);
  return lines;
}

export function paymentText(event: Pick<EventRecord, "payment_iban" | "payment_paypal_url" | "payment_note"> | null) {
  const lines = paymentLines(event);
  return lines.length ? lines.join("\n") : "Die Zahlungsdaten findest du im Mitgliederbereich.";
}

export function paymentHtml(event: Pick<EventRecord, "payment_iban" | "payment_paypal_url" | "payment_note"> | null) {
  const lines = paymentLines(event);
  if (!lines.length) return "Die Zahlungsdaten findest du im Mitgliederbereich.";
  return lines.map((line) => escapeHtml(line)).join("<br>");
}

export function bookingTemplateVariables(input: {
  booking: BookingRecord;
  event: Pick<EventRecord, "name" | "subject" | "payment_iban" | "payment_paypal_url" | "payment_note"> | null;
  profile?: Pick<ProfileRecord, "first_name" | "last_name" | "hometown"> | null;
  email?: string | null;
  dashboardUrl: string;
  confirmationUrl: string;
}) {
  const title = input.event?.subject || input.event?.name || "Gurken Treffen";
  const firstName = input.profile?.first_name || input.email || "Gurke";

  return {
    firstName,
    eventSubject: title,
    bookingMode: bookingModeLabels[input.booking.mode],
    bookingPeriod: bookingPeriod(input.booking),
    participantCount: formatParticipantCount(input.booking.participant_count),
    beerCrates: beerCrateLabel(input.booking.participant_count),
    beerCrateRegion: input.booking.beer_crate_region || "offen",
    amount: formatCurrency(input.booking.amount_cents),
    status: bookingStatusLabels[input.booking.status],
    paymentLines: paymentText(input.event),
    paymentHtml: paymentHtml(input.event),
    dashboardUrl: input.dashboardUrl,
    confirmationUrl: input.confirmationUrl
  };
}
