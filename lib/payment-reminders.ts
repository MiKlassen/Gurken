import { createAdminClient } from "@/lib/supabase/admin";
import { formatCurrency, formatDate, formatParticipantCount } from "@/lib/format";
import { getSiteUrl } from "@/lib/env";
import { decryptBookingFields, decryptProfileFields } from "@/lib/personal-data";
import { getAppSettings } from "@/lib/app-settings";
import { hasSmtpConfig, sendMail } from "@/lib/smtp";
import type { BookingMode, BookingRecord, EventRecord, ProfileRecord } from "@/lib/types";

type ReminderEvent = Pick<
  EventRecord,
  "name" | "subject" | "starts_on" | "ends_on" | "payment_iban" | "payment_paypal_url" | "payment_note"
>;

type ReminderBooking = BookingRecord & {
  profiles: Pick<ProfileRecord, "first_name" | "last_name" | "hometown"> | null;
  events: ReminderEvent | null;
};

type ReminderBookingRow = BookingRecord & {
  events: ReminderEvent | null;
};

type ReminderResult = {
  checked: number;
  sent: number;
  skipped: number;
  errors: string[];
  disabled?: boolean;
  reason?: string;
};

const bookingModeLabels: Record<BookingMode, string> = {
  overnight: "Übernachtung",
  day_guest: "Tagesgast"
};

function bookingPeriod(booking: ReminderBooking) {
  if (booking.mode === "overnight") {
    return `${formatDate(booking.arrival_date)} bis ${formatDate(booking.departure_date)}`;
  }

  return (booking.day_guest_dates || []).map(formatDate).join(", ") || "offen";
}

function firstName(booking: ReminderBooking) {
  return booking.profiles?.first_name || "Gurke";
}

function reminderProfile(profile?: ProfileRecord | null) {
  if (!profile) return null;
  return {
    first_name: profile.first_name,
    last_name: profile.last_name,
    hometown: profile.hometown
  };
}

function paymentLines(event: ReminderBooking["events"]) {
  const lines = [];
  if (event?.payment_iban) lines.push(`IBAN: ${event.payment_iban}`);
  if (event?.payment_paypal_url) lines.push(`PayPal: ${event.payment_paypal_url}`);
  if (event?.payment_note) lines.push(event.payment_note);
  return lines;
}

function paymentHtml(event: ReminderBooking["events"]) {
  const lines = paymentLines(event);
  if (!lines.length) return "<p>Die Zahlungsdaten findest du im Mitgliederbereich.</p>";

  return `<ul>${lines.map((line) => `<li>${escapeHtml(line)}</li>`).join("")}</ul>`;
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function buildReminderMail(email: string, booking: ReminderBooking) {
  const event = booking.events;
  const dashboardUrl = `${getSiteUrl()}/dashboard`;
  const salutation = `Hallo ${firstName(booking)},`;
  const title = event?.subject || event?.name || "Gurken Treffen";
  const payment = paymentLines(event);

  const text = [
    salutation,
    "",
    `du hast für ${title} gebucht, aber deine Zahlung ist noch offen.`,
    "",
    `Buchung: ${bookingModeLabels[booking.mode]}`,
    `Zeitraum: ${bookingPeriod(booking)}`,
    `Personen: ${formatParticipantCount(booking.participant_count)}`,
    `Betrag: ${formatCurrency(booking.amount_cents)}`,
    "",
    payment.length ? "Zahlungsdaten:" : "Die Zahlungsdaten findest du im Mitgliederbereich.",
    ...payment,
    "",
    "Sobald ein Admin deine Zahlung als bezahlt markiert hat, bekommst du keine Reminder mehr.",
    dashboardUrl
  ].join("\n");

  const html = [
    `<p>${escapeHtml(salutation)}</p>`,
    `<p>du hast für <strong>${escapeHtml(title)}</strong> gebucht, aber deine Zahlung ist noch offen.</p>`,
    "<table>",
    `<tr><td>Buchung</td><td>${escapeHtml(bookingModeLabels[booking.mode])}</td></tr>`,
    `<tr><td>Zeitraum</td><td>${escapeHtml(bookingPeriod(booking))}</td></tr>`,
    `<tr><td>Personen</td><td>${escapeHtml(formatParticipantCount(booking.participant_count))}</td></tr>`,
    `<tr><td>Betrag</td><td><strong>${escapeHtml(formatCurrency(booking.amount_cents))}</strong></td></tr>`,
    "</table>",
    paymentHtml(event),
    "<p>Sobald ein Admin deine Zahlung als bezahlt markiert hat, bekommst du keine Reminder mehr.</p>",
    `<p><a href="${escapeHtml(dashboardUrl)}">Mitgliederbereich öffnen</a></p>`
  ].join("");

  return {
    to: email,
    subject: `Zahlung offen: ${title}`,
    text,
    html
  };
}

async function getEmailForUser(userId: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase.auth.admin.getUserById(userId);
  if (error) throw error;
  return data.user?.email || null;
}

async function getDueBookings(thresholdIso: string, batchSize: number) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .select("*, events(name,subject,starts_on,ends_on,payment_iban,payment_paypal_url,payment_note)")
    .eq("status", "pending_payment")
    .or(`payment_reminder_sent_at.is.null,payment_reminder_sent_at.lt.${thresholdIso}`)
    .order("created_at", { ascending: true })
    .limit(batchSize);

  if (error) throw error;

  const bookingRows = (data || []) as ReminderBookingRow[];
  const userIds = Array.from(new Set(bookingRows.map((booking) => booking.user_id)));
  const profileByUserId = new Map<string, ProfileRecord>();

  if (userIds.length) {
    const { data: profiles, error: profileError } = await supabase.from("profiles").select("*").in("user_id", userIds);
    if (profileError) throw profileError;

    for (const profile of (profiles || []) as ProfileRecord[]) {
      const decryptedProfile = decryptProfileFields(profile);
      profileByUserId.set(decryptedProfile.user_id, decryptedProfile);
    }
  }

  return bookingRows.map((booking) =>
    decryptBookingFields({
      ...booking,
      profiles: reminderProfile(profileByUserId.get(booking.user_id))
    } as ReminderBooking)
  );
}

async function claimReminder(booking: ReminderBooking, nowIso: string, thresholdIso: string) {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("bookings")
    .update({
      payment_reminder_sent_at: nowIso,
      payment_reminder_count: (booking.payment_reminder_count || 0) + 1
    })
    .eq("id", booking.id)
    .eq("status", "pending_payment")
    .or(`payment_reminder_sent_at.is.null,payment_reminder_sent_at.lt.${thresholdIso}`)
    .select("id")
    .maybeSingle();

  if (error) throw error;
  return Boolean(data);
}

async function resetFailedClaim(booking: ReminderBooking) {
  const supabase = createAdminClient();
  await supabase
    .from("bookings")
    .update({
      payment_reminder_sent_at: booking.payment_reminder_sent_at,
      payment_reminder_count: booking.payment_reminder_count || 0
    })
    .eq("id", booking.id)
    .eq("status", "pending_payment");
}

export async function sendPaymentReminders(options: { enforceCronWindow?: boolean; now?: Date } = {}): Promise<ReminderResult> {
  const settings = await getAppSettings();
  if (!settings.paymentRemindersEnabled) {
    return { checked: 0, sent: 0, skipped: 0, errors: [], disabled: true, reason: "Zahlungsreminder sind deaktiviert." };
  }

  const now = options.now || new Date();
  if (options.enforceCronWindow && !settings.paymentReminderCronEnabled) {
    return { checked: 0, sent: 0, skipped: 0, errors: [], disabled: true, reason: "Reminder-Cron ist deaktiviert." };
  }

  if (!(await hasSmtpConfig())) {
    throw new Error("SMTP is not configured. Expected SMTP host/from in admin settings plus SMTP_USER and SMTP_PASSWORD in environment.");
  }

  const threshold = new Date(now.getTime() - settings.paymentReminderIntervalDays * 86_400_000);
  const thresholdIso = threshold.toISOString();
  const nowIso = now.toISOString();
  const bookings = await getDueBookings(thresholdIso, settings.paymentReminderBatchSize);
  const result: ReminderResult = { checked: bookings.length, sent: 0, skipped: 0, errors: [] };

  for (const booking of bookings) {
    try {
      const claimed = await claimReminder(booking, nowIso, thresholdIso);
      if (!claimed) {
        result.skipped += 1;
        continue;
      }

      const email = await getEmailForUser(booking.user_id);
      if (!email) {
        await resetFailedClaim(booking);
        result.errors.push(`Keine E-Mail für User ${booking.user_id}.`);
        continue;
      }

      await sendMail(buildReminderMail(email, booking));
      result.sent += 1;
    } catch (error) {
      await resetFailedClaim(booking);
      result.errors.push(error instanceof Error ? error.message : "Unbekannter Reminder-Fehler.");
    }
  }

  return result;
}
