import { bookingTemplateVariables } from "@/lib/booking-summary";
import { getEmailTemplate, renderEmailTemplate } from "@/lib/email-templates";
import { getSiteUrl } from "@/lib/env";
import { hasSmtpConfig, sendMail } from "@/lib/smtp";
import type { BookingRecord, EventRecord, ProfileRecord } from "@/lib/types";

export async function sendBookingConfirmationEmail(input: {
  email: string | null | undefined;
  event: EventRecord;
  booking: BookingRecord;
  profile: ProfileRecord | null;
}) {
  if (!input.email || !(await hasSmtpConfig())) return { sent: false, skipped: true };

  const template = await getEmailTemplate("booking_confirmation");
  const siteUrl = getSiteUrl();
  const rendered = renderEmailTemplate(
    template,
    bookingTemplateVariables({
      event: input.event,
      booking: input.booking,
      profile: input.profile,
      email: input.email,
      dashboardUrl: `${siteUrl}/dashboard`,
      confirmationUrl: `${siteUrl}/book/confirmation`
    })
  );

  await sendMail({
    to: input.email,
    subject: rendered.subject,
    text: rendered.text,
    html: rendered.html
  });

  return { sent: true, skipped: false };
}
