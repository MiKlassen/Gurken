import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import type { EmailTemplateKey, EmailTemplateRecord } from "@/lib/types";

export type RenderedEmail = {
  subject: string;
  text: string;
  html: string;
};

const defaultTemplates: Record<EmailTemplateKey, EmailTemplateRecord> = {
  booking_confirmation: {
    key: "booking_confirmation",
    name: "Buchungsbestätigung",
    subject: "Deine Buchung für {{eventSubject}}",
    text_body:
      "Hallo {{firstName}},\n\n" +
      "deine Buchung für {{eventSubject}} ist gespeichert.\n\n" +
      "Buchung: {{bookingMode}}\n" +
      "Zeitraum: {{bookingPeriod}}\n" +
      "Ankunft: {{expectedArrival}}\n" +
      "Personen: {{participantCount}}\n" +
      "Bierkastenpflicht: {{beerCrates}}\n" +
      "Bierkasten-Region: {{beerCrateRegion}}\n" +
      "Betrag: {{amount}}\n" +
      "Zahlungsstand: {{paymentBalance}}\n" +
      "Status: {{status}}\n\n" +
      "Zahlungsdaten:\n{{paymentLines}}\n\n" +
      "Deine Buchungsbestätigung findest du hier:\n{{confirmationUrl}}\n",
    html_body:
      "<p>Hallo {{firstName}},</p>" +
      "<p>deine Buchung für <strong>{{eventSubject}}</strong> ist gespeichert.</p>" +
      "<table>" +
      "<tr><td>Buchung</td><td>{{bookingMode}}</td></tr>" +
      "<tr><td>Zeitraum</td><td>{{bookingPeriod}}</td></tr>" +
      "<tr><td>Ankunft</td><td>{{expectedArrival}}</td></tr>" +
      "<tr><td>Personen</td><td>{{participantCount}}</td></tr>" +
      "<tr><td>Bierkastenpflicht</td><td>{{beerCrates}}</td></tr>" +
      "<tr><td>Bierkasten-Region</td><td>{{beerCrateRegion}}</td></tr>" +
      "<tr><td>Betrag</td><td><strong>{{amount}}</strong></td></tr>" +
      "<tr><td>Zahlungsstand</td><td>{{paymentBalance}}</td></tr>" +
      "<tr><td>Status</td><td>{{status}}</td></tr>" +
      "</table>" +
      "<p><strong>Zahlungsdaten</strong><br>{{paymentHtml}}</p>" +
      '<p><a href="{{confirmationUrl}}">Buchungsbestätigung öffnen</a></p>',
    updated_by: null,
    updated_at: ""
  },
  payment_reminder: {
    key: "payment_reminder",
    name: "Zahlungsreminder",
    subject: "Zahlung offen: {{eventSubject}}",
    text_body:
      "Hallo {{firstName}},\n\n" +
      "du hast für {{eventSubject}} gebucht, aber deine Zahlung ist noch offen.\n\n" +
      "Buchung: {{bookingMode}}\n" +
      "Zeitraum: {{bookingPeriod}}\n" +
      "Ankunft: {{expectedArrival}}\n" +
      "Personen: {{participantCount}}\n" +
      "Bierkastenpflicht: {{beerCrates}}\n" +
      "Betrag: {{amount}}\n\n" +
      "Zahlungsstand: {{paymentBalance}}\n\n" +
      "Zahlungsdaten:\n{{paymentLines}}\n\n" +
      "Sobald ein Admin deine Zahlung als bezahlt markiert hat, bekommst du keine Reminder mehr.\n" +
      "{{dashboardUrl}}",
    html_body:
      "<p>Hallo {{firstName}},</p>" +
      "<p>du hast für <strong>{{eventSubject}}</strong> gebucht, aber deine Zahlung ist noch offen.</p>" +
      "<table>" +
      "<tr><td>Buchung</td><td>{{bookingMode}}</td></tr>" +
      "<tr><td>Zeitraum</td><td>{{bookingPeriod}}</td></tr>" +
      "<tr><td>Ankunft</td><td>{{expectedArrival}}</td></tr>" +
      "<tr><td>Personen</td><td>{{participantCount}}</td></tr>" +
      "<tr><td>Bierkastenpflicht</td><td>{{beerCrates}}</td></tr>" +
      "<tr><td>Betrag</td><td><strong>{{amount}}</strong></td></tr>" +
      "<tr><td>Zahlungsstand</td><td>{{paymentBalance}}</td></tr>" +
      "</table>" +
      "<p><strong>Zahlungsdaten</strong><br>{{paymentHtml}}</p>" +
      "<p>Sobald ein Admin deine Zahlung als bezahlt markiert hat, bekommst du keine Reminder mehr.</p>" +
      '<p><a href="{{dashboardUrl}}">Mitgliederbereich öffnen</a></p>',
    updated_by: null,
    updated_at: ""
  }
};

const templateKeys = Object.keys(defaultTemplates) as EmailTemplateKey[];

export const templatePlaceholderHelp = [
  "firstName",
  "eventSubject",
  "bookingMode",
  "bookingPeriod",
  "expectedArrival",
  "participantCount",
  "beerCrates",
  "beerCrateRegion",
  "amount",
  "paidAmount",
  "remainingAmount",
  "refundAmount",
  "paymentBalance",
  "status",
  "paymentLines",
  "paymentHtml",
  "dashboardUrl",
  "confirmationUrl"
];

function isEmailTemplateKey(value: string): value is EmailTemplateKey {
  return templateKeys.includes(value as EmailTemplateKey);
}

export function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function renderString(template: string, variables: Record<string, string>, options: { html?: boolean } = {}) {
  return template.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_match, key: string) => {
    const value = variables[key] ?? "";
    if (options.html && key !== "paymentHtml") return escapeHtml(value);
    return value;
  });
}

export function renderEmailTemplate(template: EmailTemplateRecord, variables: Record<string, string>): RenderedEmail {
  return {
    subject: renderString(template.subject, variables),
    text: renderString(template.text_body, variables),
    html: renderString(template.html_body, variables, { html: true })
  };
}

export async function getEmailTemplates(): Promise<EmailTemplateRecord[]> {
  if (!hasSupabaseEnv() || !hasServiceRoleKey()) return templateKeys.map((key) => defaultTemplates[key]);

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("email_templates").select("*");
    if (error) return templateKeys.map((key) => defaultTemplates[key]);

    const rows = new Map(((data || []) as EmailTemplateRecord[]).map((template) => [template.key, template]));
    return templateKeys.map((key) => rows.get(key) || defaultTemplates[key]);
  } catch {
    return templateKeys.map((key) => defaultTemplates[key]);
  }
}

export async function getEmailTemplate(key: EmailTemplateKey) {
  const templates = await getEmailTemplates();
  return templates.find((template) => template.key === key) || defaultTemplates[key];
}

export async function saveEmailTemplates(templates: EmailTemplateRecord[], userId: string) {
  const rows = templates
    .filter((template) => isEmailTemplateKey(template.key))
    .map((template) => ({
      key: template.key,
      name: template.name,
      subject: template.subject,
      text_body: template.text_body,
      html_body: template.html_body,
      updated_by: userId
    }));

  const supabase = createAdminClient();
  return supabase.from("email_templates").upsert(rows, { onConflict: "key" });
}
