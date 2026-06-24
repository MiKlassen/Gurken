"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { saveAppSettings, type AppSettings } from "@/lib/app-settings";
import { requireAdmin } from "@/lib/data";
import { saveEmailTemplates } from "@/lib/email-templates";
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
import type { BookingRecord, BookingStatus, EmailTemplateKey, GalleryPhoto, ProfileRecord } from "@/lib/types";

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

const emailTemplateNames: Record<EmailTemplateKey, string> = {
  booking_confirmation: "Buchungsbestätigung",
  payment_reminder: "Zahlungsreminder"
};

export async function saveEventAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

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
    member_limit: int(formData, "memberLimit"),
    overnight_price_cents: cents(formData, "overnightPrice"),
    day_guest_price_cents: cents(formData, "dayGuestPrice"),
    payment_iban: text(formData, "paymentIban") || null,
    payment_paypal_url: text(formData, "paymentPaypalUrl") || null,
    payment_note: text(formData, "paymentNote") || null
  };

  if (!payload.year || !payload.name || !payload.subject || !payload.slug || !payload.starts_on || !payload.ends_on || !payload.member_limit) {
    redirect("/admin?bereich=event&error=Bitte alle Pflichtfelder für das Treffen ausfüllen.");
  }

  const startsAt = dateValue(payload.starts_on);
  const endsAt = dateValue(payload.ends_on);
  if (startsAt === null || endsAt === null) {
    redirect("/admin?bereich=event&error=Bitte gültige Datumswerte angeben.");
  }

  if (endsAt < startsAt) {
    redirect("/admin?bereich=event&error=Das Enddatum darf nicht vor dem Startdatum liegen.");
  }

  if (payload.overnight_price_cents < 0 || payload.day_guest_price_cents < 0) {
    redirect("/admin?bereich=event&error=Preise dürfen nicht negativ sein.");
  }

  const query = eventId
    ? supabase.from("events").update(payload).eq("id", eventId)
    : supabase.from("events").insert(payload);

  const { error } = await query;
  if (error) redirect(`/admin?bereich=event&error=${encodeURIComponent(error.message)}`);

  revalidatePath("/");
  revalidatePath("/dashboard");
  revalidatePath("/book");
  revalidatePath("/location");
  revalidatePath("/event");
  revalidatePath("/admin");
  redirect("/admin?bereich=event&message=Treffen gespeichert.");
}

export async function saveLocationSettingsAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const eventId = text(formData, "eventId");
  const locationUrl = optionalUrl(formData, "locationUrl");

  if (!eventId) {
    redirect("/admin?bereich=ort&error=Bitte zuerst ein Treffen anlegen.");
  }

  if (locationUrl === "") {
    redirect("/admin?bereich=ort&error=Bitte einen gültigen Ortslink mit http oder https angeben.");
  }

  const payload = {
    location_label: text(formData, "locationLabel") || "Ort nach Login",
    location_address: nullableText(formData, "locationAddress"),
    location_url: locationUrl || null,
    location_details: text(formData, "locationDetails"),
    location_meta_label_1: nullableText(formData, "locationMetaLabel1"),
    location_meta_value_1: nullableText(formData, "locationMetaValue1"),
    location_meta_label_2: nullableText(formData, "locationMetaLabel2"),
    location_meta_value_2: nullableText(formData, "locationMetaValue2")
  };

  const { error } = await supabase.from("events").update(payload).eq("id", eventId);
  if (error) redirect(`/admin?bereich=ort&error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/location");
  revalidatePath("/event");
  redirect("/admin?bereich=ort&message=Ortseinstellungen gespeichert.");
}

export async function saveRoomAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const eventId = text(formData, "eventId");
  const roomId = text(formData, "roomId");
  const name = text(formData, "roomName");

  if (!eventId) {
    redirect("/admin?bereich=ort&error=Bitte zuerst ein Treffen anlegen.");
  }

  if (!name) {
    redirect("/admin?bereich=ort&error=Bitte einen Zimmernamen angeben.");
  }

  const payload = {
    event_id: eventId,
    name,
    is_multi_bed: checkbox(formData, "isMultiBed"),
    bed_count: boundedInt(formData, "bedCount", 1, 1, 100),
    notes: nullableText(formData, "roomNotes"),
    sort_order: boundedInt(formData, "sortOrder", 0, 0, 10_000)
  };

  const query = roomId
    ? supabase
        .from("event_rooms")
        .update(payload)
        .eq("id", roomId)
        .eq("event_id", eventId)
    : supabase.from("event_rooms").insert(payload);

  const { error } = await query;
  if (error) redirect(`/admin?bereich=ort&error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin");
  revalidatePath("/event");
  redirect("/admin?bereich=ort&message=Zimmer gespeichert.");
}

export async function deleteRoomAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();
  const roomId = text(formData, "roomId");
  const eventId = text(formData, "eventId");

  if (!roomId || !eventId) {
    redirect("/admin?bereich=ort&error=Zimmer fehlt.");
  }

  const { error } = await supabase.from("event_rooms").delete().eq("id", roomId).eq("event_id", eventId);
  if (error) redirect(`/admin?bereich=ort&error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin");
  revalidatePath("/event");
  redirect("/admin?bereich=ort&message=Zimmer gelöscht.");
}

export async function saveRoomAssignmentAction(formData: FormData) {
  const user = await requireAdmin();
  const supabase = await createClient();
  const bookingId = text(formData, "bookingId");
  const roomId = text(formData, "roomId");

  if (!bookingId) {
    redirect("/event?error=Buchung fehlt.");
  }

  if (!roomId) {
    const { error } = await supabase.from("event_room_assignments").delete().eq("booking_id", bookingId);
    if (error) redirect(`/event?error=${encodeURIComponent(error.message)}`);

    revalidatePath("/event");
    redirect("/event?message=Zimmerzuteilung entfernt.");
  }

  const [{ data: booking, error: bookingError }, { data: room, error: roomError }] = await Promise.all([
    supabase.from("bookings").select("id,event_id").eq("id", bookingId).single(),
    supabase.from("event_rooms").select("id,event_id").eq("id", roomId).single()
  ]);

  if (bookingError || !booking) {
    redirect(`/event?error=${encodeURIComponent(bookingError?.message || "Buchung nicht gefunden.")}`);
  }

  if (roomError || !room) {
    redirect(`/event?error=${encodeURIComponent(roomError?.message || "Zimmer nicht gefunden.")}`);
  }

  if ((booking as { event_id: string }).event_id !== (room as { event_id: string }).event_id) {
    redirect("/event?error=Zimmer und Buchung gehören nicht zum selben Event.");
  }

  const { error } = await supabase.from("event_room_assignments").upsert(
    {
      booking_id: bookingId,
      room_id: roomId,
      assigned_by: user.id
    },
    { onConflict: "booking_id" }
  );

  if (error) redirect(`/event?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/event");
  redirect("/event?message=Zimmerzuteilung gespeichert.");
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
    redirect("/admin?bereich=einstellungen&error=Bitte einen SMTP-Absender angeben.");
  }

  if (settings.paymentRemindersEnabled && !settings.smtpHost) {
    redirect("/admin?bereich=einstellungen&error=Bitte SMTP-Host setzen oder Zahlungsreminder deaktivieren.");
  }

  const { error } = await saveAppSettings(settings, user.id);
  if (error) redirect(`/admin?bereich=einstellungen&error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin");
  redirect("/admin?bereich=einstellungen&message=Systemeinstellungen gespeichert.");
}

export async function saveEmailTemplatesAction(formData: FormData) {
  const user = await requireAdmin();
  const keys = Object.keys(emailTemplateNames) as EmailTemplateKey[];
  const templates = keys.map((key) => ({
    key,
    name: emailTemplateNames[key],
    subject: text(formData, `${key}_subject`),
    text_body: text(formData, `${key}_text`),
    html_body: text(formData, `${key}_html`),
    updated_by: user.id,
    updated_at: ""
  }));

  if (templates.some((template) => !template.subject || !template.text_body || !template.html_body)) {
    redirect("/admin?bereich=mails&error=Bitte für jedes Template Betreff, Text und HTML ausfüllen.");
  }

  const { error } = await saveEmailTemplates(templates, user.id);
  if (error) redirect(`/admin?bereich=mails&error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin");
  redirect("/admin?bereich=mails&message=E-Mail-Templates gespeichert.");
}

export async function updateBookingStatusAction(formData: FormData) {
  await requireAdmin();

  const bookingId = text(formData, "bookingId");
  const status = text(formData, "status") as BookingStatus;

  if (!bookingId || !["pending_payment", "paid", "waitlisted", "cancelled"].includes(status)) {
    redirect("/admin?bereich=buchungen&error=Ungültiger Buchungsstatus.");
  }

  const supabase = await createClient();
  let update: Partial<BookingRecord> = { status };

  if (status === "paid") {
    const { data: booking, error: bookingError } = await supabase.from("bookings").select("amount_cents").eq("id", bookingId).single();
    if (bookingError || !booking) redirect(`/admin?bereich=buchungen&error=${encodeURIComponent(bookingError?.message || "Buchung nicht gefunden.")}`);

    update = {
      ...update,
      paid_amount_cents: (booking as Pick<BookingRecord, "amount_cents">).amount_cents,
      payment_confirmed_at: new Date().toISOString()
    };
  }

  const { error } = await supabase.from("bookings").update(update).eq("id", bookingId);

  if (error) redirect(`/admin?bereich=buchungen&error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/book/confirmation");
  redirect("/admin?bereich=buchungen&message=Buchung aktualisiert.");
}

export async function confirmBookingAction(formData: FormData) {
  await requireAdmin();

  const bookingId = text(formData, "bookingId");
  if (!bookingId) {
    redirect("/admin?bereich=buchungen&error=Buchung fehlt.");
  }

  const supabase = await createClient();
  const { data: booking, error: bookingError } = await supabase.from("bookings").select("amount_cents").eq("id", bookingId).single();
  if (bookingError || !booking) redirect(`/admin?bereich=buchungen&error=${encodeURIComponent(bookingError?.message || "Buchung nicht gefunden.")}`);

  const { error } = await supabase
    .from("bookings")
    .update({
      status: "paid" satisfies BookingStatus,
      paid_amount_cents: (booking as Pick<BookingRecord, "amount_cents">).amount_cents,
      payment_confirmed_at: new Date().toISOString()
    })
    .eq("id", bookingId);

  if (error) redirect(`/admin?bereich=buchungen&error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/book/confirmation");
  redirect("/admin?bereich=buchungen&message=Zahlung bestätigt.");
}

export async function revokeBookingPaymentAction(formData: FormData) {
  await requireAdmin();

  const bookingId = text(formData, "bookingId");
  if (!bookingId) {
    redirect("/admin?bereich=buchungen&error=Buchung fehlt.");
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("bookings")
    .update({
      status: "pending_payment" satisfies BookingStatus,
      paid_amount_cents: 0,
      payment_confirmed_at: null
    })
    .eq("id", bookingId);

  if (error) redirect(`/admin?bereich=buchungen&error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/book/confirmation");
  redirect("/admin?bereich=buchungen&message=Zahlung zurückgenommen.");
}

export async function promoteMemberToAdminAction(formData: FormData) {
  const user = await requireAdmin();
  const userId = text(formData, "userId");

  if (!userId) {
    redirect("/admin?bereich=mitglieder&error=Mitglied fehlt.");
  }

  const supabase = await createClient();
  const { error } = await supabase.from("admin_memberships").upsert(
    {
      user_id: userId,
      granted_by: user.id
    },
    { onConflict: "user_id" }
  );

  if (error) redirect(`/admin?bereich=mitglieder&error=${encodeURIComponent(error.message)}`);

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  redirect("/admin?bereich=mitglieder&message=Mitglied ist jetzt Admin.");
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
  if (firstError) redirect(`/admin?bereich=admins&error=${encodeURIComponent(firstError.message)}`);

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
    if (updateError) redirect(`/admin?bereich=admins&error=${encodeURIComponent(updateError.message)}`);
  } catch (error) {
    redirect(`/admin?bereich=admins&error=${encodeURIComponent(error instanceof Error ? error.message : "Verschlüsselung fehlgeschlagen.")}`);
  }

  revalidatePath("/admin");
  revalidatePath("/dashboard");
  revalidatePath("/book");
  revalidatePath("/gallery");
  revalidatePath("/gallery/slideshow");
  redirect(`/admin?bereich=admins&message=${profiles.length + bookings.length + photos.length} Datensätze verschlüsselt.`);
}

export async function addAdminAction(formData: FormData) {
  const user = await requireAdmin();
  const email = text(formData, "email").toLowerCase();
  if (!email) redirect("/admin?bereich=admins&error=Bitte E-Mail für neuen Admin angeben.");

  const adminClient = createAdminClient();
  const { data, error: listError } = await adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 });
  if (listError) redirect(`/admin?bereich=admins&error=${encodeURIComponent(listError.message)}`);

  const target = data.users.find((candidate) => candidate.email?.toLowerCase() === email);
  if (!target) redirect(`/admin?bereich=admins&error=${encodeURIComponent(`Kein Benutzer für ${email} gefunden.`)}`);

  const { error } = await adminClient.from("admin_memberships").upsert(
    {
      user_id: target.id,
      granted_by: user.id
    },
    { onConflict: "user_id" }
  );

  if (error) redirect(`/admin?bereich=admins&error=${encodeURIComponent(error.message)}`);
  redirect("/admin?bereich=admins&message=Admin hinzugefügt.");
}
