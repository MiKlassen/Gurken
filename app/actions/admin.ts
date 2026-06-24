"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { saveAppSettings, type AppSettings } from "@/lib/app-settings";
import { requireAdmin } from "@/lib/data";
import {
  decryptBookingFields,
  decryptGalleryPhoto,
  decryptProfileFields,
  encryptBeerCrateRegion,
  encryptGalleryCaption,
  encryptProfileFields
} from "@/lib/personal-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { BookingRecord, BookingStatus, GalleryPhoto, ProfileRecord } from "@/lib/types";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function cents(formData: FormData, key: string) {
  const raw = text(formData, key).replace(",", ".");
  const number = Number.parseFloat(raw);
  if (Number.isNaN(number)) return 0;
  return Math.round(number * 100);
}

function int(formData: FormData, key: string) {
  const number = Number.parseInt(text(formData, key), 10);
  return Number.isNaN(number) ? 0 : number;
}

function boundedInt(formData: FormData, key: string, fallback: number, min: number, max: number) {
  const number = int(formData, key);
  if (!Number.isFinite(number) || number < min || number > max) return fallback;
  return number;
}

function checkbox(formData: FormData, key: string) {
  return formData.get(key) === "on";
}

function dateValue(value: string) {
  const time = Date.parse(`${value}T00:00:00Z`);
  return Number.isNaN(time) ? null : time;
}

function nullableText(formData: FormData, key: string) {
  return text(formData, key) || null;
}

function optionalUrl(formData: FormData, key: string) {
  const value = text(formData, key);
  if (!value) return null;

  try {
    const url = new URL(value);
    if (url.protocol !== "http:" && url.protocol !== "https:") return "";
    return url.toString();
  } catch {
    return "";
  }
}

export async function saveEventAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const locationUrl = optionalUrl(formData, "locationUrl");

  const eventId = text(formData, "eventId");
  const payload = {
    year: int(formData, "year"),
    name: text(formData, "name"),
    subject: text(formData, "subject"),
    slug: text(formData, "slug"),
    is_active: formData.get("isActive") === "on",
    starts_on: text(formData, "startsOn"),
    ends_on: text(formData, "endsOn"),
    public_summary: text(formData, "publicSummary"),
    location_label: text(formData, "locationLabel"),
    location_address: nullableText(formData, "locationAddress"),
    location_url: locationUrl || null,
    location_details: text(formData, "locationDetails"),
    location_meta_label_1: nullableText(formData, "locationMetaLabel1"),
    location_meta_value_1: nullableText(formData, "locationMetaValue1"),
    location_meta_label_2: nullableText(formData, "locationMetaLabel2"),
    location_meta_value_2: nullableText(formData, "locationMetaValue2"),
    member_limit: int(formData, "memberLimit"),
    overnight_price_cents: cents(formData, "overnightPrice"),
    day_guest_price_cents: cents(formData, "dayGuestPrice"),
    payment_iban: text(formData, "paymentIban") || null,
    payment_paypal_url: text(formData, "paymentPaypalUrl") || null,
    payment_note: text(formData, "paymentNote") || null
  };

  if (!payload.year || !payload.name || !payload.subject || !payload.slug || !payload.starts_on || !payload.ends_on || !payload.member_limit) {
    redirect("/admin?error=Bitte alle Pflichtfelder für das Treffen ausfüllen.");
  }

  if (locationUrl === "") {
    redirect("/admin?error=Bitte einen gültigen Ortslink mit http oder https angeben.");
  }

  const startsAt = dateValue(payload.starts_on);
  const endsAt = dateValue(payload.ends_on);
  if (startsAt === null || endsAt === null) {
    redirect("/admin?error=Bitte gültige Datumswerte angeben.");
  }

  if (endsAt < startsAt) {
    redirect("/admin?error=Das Enddatum darf nicht vor dem Startdatum liegen.");
  }

  if (payload.overnight_price_cents < 0 || payload.day_guest_price_cents < 0) {
    redirect("/admin?error=Preise dürfen nicht negativ sein.");
  }

  const query = eventId
    ? supabase.from("events").update(payload).eq("id", eventId)
    : supabase.from("events").insert(payload);

  const { error } = await query;
  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/book");
  revalidatePath("/location");
  revalidatePath("/admin");
  redirect("/admin?message=Treffen gespeichert.");
}

export async function saveAppSettingsAction(formData: FormData) {
  const user = await requireAdmin();
  const smtpPort = boundedInt(formData, "smtpPort", 587, 1, 65_535);
  const settings: AppSettings = {
    smtpHost: text(formData, "smtpHost"),
    smtpPort,
    smtpSecure: checkbox(formData, "smtpSecure"),
    smtpStartTls: checkbox(formData, "smtpStartTls"),
    smtpFrom: text(formData, "smtpFrom"),
    smtpReplyTo: text(formData, "smtpReplyTo"),
    smtpTimeoutMs: boundedInt(formData, "smtpTimeoutMs", 15_000, 1_000, 120_000),
    paymentRemindersEnabled: checkbox(formData, "paymentRemindersEnabled"),
    paymentReminderIntervalDays: boundedInt(formData, "paymentReminderIntervalDays", 7, 1, 365),
    paymentReminderBatchSize: boundedInt(formData, "paymentReminderBatchSize", 50, 1, 100),
    paymentReminderCronEnabled: checkbox(formData, "paymentReminderCronEnabled")
  };

  if (!settings.smtpFrom) {
    redirect("/admin?error=Bitte einen SMTP-Absender angeben.");
  }

  if (settings.paymentRemindersEnabled && !settings.smtpHost) {
    redirect("/admin?error=Bitte SMTP-Host setzen oder Zahlungsreminder deaktivieren.");
  }

  const { error } = await saveAppSettings(settings, user.id);
  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin");
  redirect("/admin?message=Systemeinstellungen gespeichert.");
}

export async function updateBookingStatusAction(formData: FormData) {
  await requireAdmin();

  const bookingId = text(formData, "bookingId");
  const status = text(formData, "status") as BookingStatus;

  if (!bookingId || !["pending_payment", "paid", "waitlisted", "cancelled"].includes(status)) {
    redirect("/admin?error=Ungültiger Buchungsstatus.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("bookings").update({ status }).eq("id", bookingId);

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect("/admin?message=Buchung aktualisiert.");
}

export async function confirmBookingAction(formData: FormData) {
  await requireAdmin();

  const bookingId = text(formData, "bookingId");
  if (!bookingId) {
    redirect("/admin?error=Buchung fehlt.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("bookings").update({ status: "paid" satisfies BookingStatus }).eq("id", bookingId);

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect("/admin?message=Buchung bestätigt.");
}

export async function promoteMemberToAdminAction(formData: FormData) {
  const user = await requireAdmin();
  const userId = text(formData, "userId");

  if (!userId) {
    redirect("/admin?error=Mitglied fehlt.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("admin_memberships").upsert(
    {
      user_id: userId,
      granted_by: user.id
    },
    { onConflict: "user_id" }
  );

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect("/admin?message=Mitglied ist jetzt Admin.");
}

export async function encryptExistingPersonalDataAction() {
  await requireAdmin();
  const supabase = await createClient();

  const [profilesResult, bookingsResult, photosResult] = await Promise.all([
    supabase.from("profiles").select("*"),
    supabase.from("bookings").select("*"),
    supabase.from("gallery_photos").select("*")
  ]);

  const firstError = profilesResult.error || bookingsResult.error || photosResult.error;
  if (firstError) redirect(`/admin?error=${encodeURIComponent(firstError.message)}`);

  const profiles = (profilesResult.data || []) as ProfileRecord[];
  const bookings = (bookingsResult.data || []) as BookingRecord[];
  const photos = (photosResult.data || []) as GalleryPhoto[];

  try {
    const updates = [
      ...profiles.map((profile) =>
        supabase
          .from("profiles")
          .update(encryptProfileFields(decryptProfileFields(profile)))
          .eq("user_id", profile.user_id)
      ),
      ...bookings.map((booking) => {
        const decrypted = decryptBookingFields(booking);
        return supabase
          .from("bookings")
          .update({ beer_crate_region: encryptBeerCrateRegion(decrypted.beer_crate_region) })
          .eq("id", booking.id);
      }),
      ...photos.map((photo) => {
        const decrypted = decryptGalleryPhoto(photo);
        return supabase
          .from("gallery_photos")
          .update({ caption: encryptGalleryCaption(decrypted.caption) })
          .eq("id", photo.id);
      })
    ];

    const results = await Promise.all(updates);
    const updateError = results.find((result) => result.error)?.error;
    if (updateError) redirect(`/admin?error=${encodeURIComponent(updateError.message)}`);
  } catch (error) {
    redirect(`/admin?error=${encodeURIComponent(error instanceof Error ? error.message : "Verschlüsselung fehlgeschlagen.")}`);
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/book");
  revalidatePath("/gallery");
  revalidatePath("/gallery/slideshow");
  redirect(`/admin?message=${profiles.length + bookings.length + photos.length} Datensätze verschlüsselt.`);
}

export async function addAdminAction(formData: FormData) {
  const user = await requireAdmin();
  const email = text(formData, "email").toLowerCase();
  if (!email) redirect("/admin?error=Bitte E-Mail für neuen Admin angeben.");

  const adminClient = createAdminClient();
  const { data, error: listError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) redirect(`/admin?error=${encodeURIComponent(listError.message)}`);

  const target = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
  if (!target) redirect(`/admin?error=${encodeURIComponent(`Kein Benutzer für ${email} gefunden.`)}`);

  const { error } = await adminClient.from("admin_memberships").upsert(
    {
      user_id: target.id,
      granted_by: user.id
    },
    { onConflict: "user_id" }
  );

  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);
  redirect("/admin?message=Admin hinzugefügt.");
}
