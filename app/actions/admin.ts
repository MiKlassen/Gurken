"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { BookingStatus } from "@/lib/types";

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

export async function saveEventAction(formData: FormData) {
  await requireAdmin();
  const supabase = await createClient();

  const eventId = text(formData, "eventId");
  const payload = {
    year: int(formData, "year"),
    name: text(formData, "name"),
    slug: text(formData, "slug"),
    is_active: formData.get("isActive") === "on",
    starts_on: text(formData, "startsOn"),
    ends_on: text(formData, "endsOn"),
    public_summary: text(formData, "publicSummary"),
    location_label: text(formData, "locationLabel"),
    location_details: text(formData, "locationDetails"),
    member_limit: int(formData, "memberLimit"),
    overnight_price_cents: cents(formData, "overnightPrice"),
    day_guest_price_cents: cents(formData, "dayGuestPrice"),
    payment_iban: text(formData, "paymentIban") || null,
    payment_paypal_url: text(formData, "paymentPaypalUrl") || null,
    payment_note: text(formData, "paymentNote") || null
  };

  if (!payload.year || !payload.name || !payload.slug || !payload.starts_on || !payload.ends_on || !payload.member_limit) {
    redirect("/admin?error=Bitte alle Pflichtfelder für das Treffen ausfüllen.");
  }

  const query = eventId
    ? supabase.from("events").update(payload).eq("id", eventId)
    : supabase.from("events").insert(payload);

  const { error } = await query;
  if (error) redirect(`/admin?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/");
  revalidatePath("/dashboard");
  redirect("/admin?message=Treffen gespeichert.");
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
