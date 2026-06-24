import { createAdminClient } from "@/lib/supabase/admin";
import { bookingTemplateVariables } from "@/lib/booking-summary";
import { getEmailTemplate, renderEmailTemplate } from "@/lib/email-templates";
import { getSiteUrl } from "@/lib/env";
import { decryptBookingFields, decryptProfileFields } from "@/lib/personal-data";
import { getAppSettings } from "@/lib/app-settings";
import { hasSmtpConfig, sendMail } from "@/lib/smtp";
import type { BookingRecord, EventRecord, ProfileRecord } from "@/lib/types";

type ReminderEvent = Pick<
  EventRecord,
  "name" | "subject" | "starts_on" | "ends_on" | "payment_iban" | "payment_paypal_url" | "payment_note"
>;

type ReminderBooking = BookingRecord & {
  profiles: Pick<
    ProfileRecord,
    "first_name" | "last_name" | "hometown" | "street_address" | "postal_code" | "city" | "expected_arrival_at"
  > | null;
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

function reminderProfile(profile?: ProfileRecord | null) {
  if (!profile) return null;
  return {
    first_name: profile.first_name,
    last_name: profile.last_name,
    hometown: profile.hometown,
    street_address: profile.street_address,
    postal_code: profile.postal_code,
    city: profile.city,
    expected_arrival_at: profile.expected_arrival_at
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
  const template = await getEmailTemplate("payment_reminder");
  const siteUrl = getSiteUrl();
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

      const rendered = renderEmailTemplate(
        template,
        bookingTemplateVariables({
          booking,
          event: booking.events,
          profile: booking.profiles,
          email,
          dashboardUrl: `${siteUrl}/dashboard`,
          confirmationUrl: `${siteUrl}/book/confirmation`
        })
      );

      await sendMail({
        to: email,
        subject: rendered.subject,
        text: rendered.text,
        html: rendered.html
      });
      result.sent += 1;
    } catch (error) {
      await resetFailedClaim(booking);
      result.errors.push(error instanceof Error ? error.message : "Unbekannter Reminder-Fehler.");
    }
  }

  return result;
}
