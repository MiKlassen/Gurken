import { hasSupabaseEnv } from "@/lib/env";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";

export type AppSettings = {
  smtpHost: string;
  smtpPort: number;
  smtpSecure: boolean;
  smtpStartTls: boolean;
  smtpFrom: string;
  smtpReplyTo: string;
  smtpTimeoutMs: number;
  paymentRemindersEnabled: boolean;
  paymentReminderIntervalDays: number;
  paymentReminderBatchSize: number;
  paymentReminderCronEnabled: boolean;
};

export type SecretConfigStatus = {
  cronSecret: boolean;
  smtpUser: boolean;
  smtpPassword: boolean;
};

type AppSettingRow = {
  key: string;
  value: unknown;
};

const settingKeys = {
  smtpHost: "smtp_host",
  smtpPort: "smtp_port",
  smtpSecure: "smtp_secure",
  smtpStartTls: "smtp_starttls",
  smtpFrom: "smtp_from",
  smtpReplyTo: "smtp_reply_to",
  smtpTimeoutMs: "smtp_timeout_ms",
  paymentRemindersEnabled: "payment_reminders_enabled",
  paymentReminderIntervalDays: "payment_reminder_interval_days",
  paymentReminderBatchSize: "payment_reminder_batch_size",
  paymentReminderCronEnabled: "payment_reminder_cron_enabled"
} as const satisfies Record<keyof AppSettings, string>;

function envFlag(name: string, defaultValue: boolean) {
  const raw = process.env[name];
  if (raw === undefined) return defaultValue;
  return ["1", "true", "yes", "on"].includes(raw.toLowerCase());
}

function envInt(name: string, defaultValue: number, min: number, max: number) {
  const parsed = Number.parseInt(process.env[name] || "", 10);
  if (!Number.isFinite(parsed)) return defaultValue;
  return Math.min(Math.max(parsed, min), max);
}

function baseSettings(): AppSettings {
  const smtpPort = envInt("SMTP_PORT", 587, 1, 65_535);
  return {
    smtpHost: process.env.SMTP_HOST || "",
    smtpPort,
    smtpSecure: envFlag("SMTP_SECURE", smtpPort === 465),
    smtpStartTls: envFlag("SMTP_STARTTLS", true),
    smtpFrom: process.env.SMTP_FROM || "Gurken Treffen <noreply@gurken.family>",
    smtpReplyTo: process.env.SMTP_REPLY_TO || "",
    smtpTimeoutMs: envInt("SMTP_TIMEOUT_MS", 15_000, 1_000, 120_000),
    paymentRemindersEnabled: envFlag("PAYMENT_REMINDERS_ENABLED", true),
    paymentReminderIntervalDays: envInt("PAYMENT_REMINDER_INTERVAL_DAYS", 7, 1, 365),
    paymentReminderBatchSize: envInt("PAYMENT_REMINDER_BATCH_SIZE", 50, 1, 100),
    paymentReminderCronEnabled: envFlag("PAYMENT_REMINDER_CRON_ENABLED", true)
  };
}

function rowMap(rows: AppSettingRow[]) {
  return new Map(rows.map((row) => [row.key, row.value]));
}

function stringSetting(rows: Map<string, unknown>, key: string, fallback: string) {
  const value = rows.get(key);
  return typeof value === "string" ? value : fallback;
}

function intSetting(rows: Map<string, unknown>, key: string, fallback: number, min: number, max: number) {
  const value = rows.get(key);
  const number = typeof value === "number" ? value : typeof value === "string" ? Number.parseInt(value, 10) : Number.NaN;
  if (!Number.isFinite(number)) return fallback;
  return Math.min(Math.max(Math.trunc(number), min), max);
}

function boolSetting(rows: Map<string, unknown>, key: string, fallback: boolean) {
  const value = rows.get(key);
  if (typeof value === "boolean") return value;
  if (typeof value === "string") return ["1", "true", "yes", "on"].includes(value.toLowerCase());
  return fallback;
}

export function getSecretConfigStatus(): SecretConfigStatus {
  return {
    cronSecret: Boolean(process.env.CRON_SECRET),
    smtpUser: Boolean(process.env.SMTP_USER),
    smtpPassword: Boolean(process.env.SMTP_PASSWORD)
  };
}

export async function getAppSettings(): Promise<AppSettings> {
  const fallback = baseSettings();
  if (!hasSupabaseEnv() || !hasServiceRoleKey()) return fallback;

  try {
    const supabase = createAdminClient();
    const { data, error } = await supabase.from("app_settings").select("key,value");
    if (error) return fallback;

    const rows = rowMap((data || []) as AppSettingRow[]);
    return {
      smtpHost: stringSetting(rows, settingKeys.smtpHost, fallback.smtpHost),
      smtpPort: intSetting(rows, settingKeys.smtpPort, fallback.smtpPort, 1, 65_535),
      smtpSecure: boolSetting(rows, settingKeys.smtpSecure, fallback.smtpSecure),
      smtpStartTls: boolSetting(rows, settingKeys.smtpStartTls, fallback.smtpStartTls),
      smtpFrom: stringSetting(rows, settingKeys.smtpFrom, fallback.smtpFrom),
      smtpReplyTo: stringSetting(rows, settingKeys.smtpReplyTo, fallback.smtpReplyTo),
      smtpTimeoutMs: intSetting(rows, settingKeys.smtpTimeoutMs, fallback.smtpTimeoutMs, 1_000, 120_000),
      paymentRemindersEnabled: boolSetting(
        rows,
        settingKeys.paymentRemindersEnabled,
        fallback.paymentRemindersEnabled
      ),
      paymentReminderIntervalDays: intSetting(
        rows,
        settingKeys.paymentReminderIntervalDays,
        fallback.paymentReminderIntervalDays,
        1,
        365
      ),
      paymentReminderBatchSize: intSetting(
        rows,
        settingKeys.paymentReminderBatchSize,
        fallback.paymentReminderBatchSize,
        1,
        100
      ),
      paymentReminderCronEnabled: boolSetting(
        rows,
        settingKeys.paymentReminderCronEnabled,
        fallback.paymentReminderCronEnabled
      )
    };
  } catch {
    return fallback;
  }
}

export async function saveAppSettings(settings: AppSettings, userId: string) {
  const supabase = createAdminClient();
  const rows = (Object.keys(settingKeys) as Array<keyof AppSettings>).map((settingName) => ({
    key: settingKeys[settingName],
    value: settings[settingName],
    updated_by: userId
  }));

  return supabase.from("app_settings").upsert(rows, { onConflict: "key" });
}
