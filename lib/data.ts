import { redirect } from "next/navigation";
import { hasSupabaseEnv, getInitialAdminEmails } from "@/lib/env";
import { createAdminClient, hasServiceRoleKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { BookingRecord, BookingWithProfile, EventRecord, GalleryPhoto, ProfileRecord } from "@/lib/types";

export const demoEvent: EventRecord = {
  id: "demo",
  year: 2026,
  name: "Stimme-Staemme Treffen",
  slug: "stimme-staemme-2026",
  is_active: true,
  starts_on: "2026-08-14",
  ends_on: "2026-08-17",
  public_summary: "Ein internes Gurken-Wochenende mit Stimmen, Stämmen, Kaltgetraenken und regionaler Bierkastenpflicht.",
  location_label: "Ort nach Login",
  location_details: "Der genaue Treffpunkt ist im Mitgliederbereich sichtbar.",
  member_limit: 42,
  overnight_price_cents: 2500,
  day_guest_price_cents: 1200,
  payment_iban: "DE00 0000 0000 0000 0000 00",
  payment_paypal_url: "https://paypal.me/gurkenpool",
  payment_note: "Bitte Namen im Verwendungszweck angeben."
};

export function isProfileComplete(profile: ProfileRecord | null) {
  return Boolean(profile?.first_name && profile.last_name && profile.hometown);
}

export async function getActiveEventPublic() {
  if (!hasSupabaseEnv() || !hasServiceRoleKey()) return demoEvent;

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("events")
    .select(
      "id, year, name, slug, is_active, starts_on, ends_on, public_summary, location_label, location_details, member_limit, overnight_price_cents, day_guest_price_cents, payment_iban, payment_paypal_url, payment_note"
    )
    .eq("is_active", true)
    .order("starts_on", { ascending: true })
    .limit(1)
    .maybeSingle();

  if (error || !data) return demoEvent;
  return data as EventRecord;
}

export async function requireVerifiedUser() {
  if (!hasSupabaseEnv()) redirect("/auth/login?error=Supabase ist noch nicht konfiguriert.");

  const supabase = await createClient();
  const {
    data: { user }
  } = await supabase.auth.getUser();

  if (!user) redirect("/auth/login");

  const verified = Boolean(user.email_confirmed_at || user.confirmed_at);
  if (!verified) redirect("/auth/verify");

  return user;
}

export async function getCurrentProfile(userId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("profiles").select("*").eq("user_id", userId).maybeSingle();
  return data as ProfileRecord | null;
}

export async function requireCompleteProfile(userId: string) {
  const profile = await getCurrentProfile(userId);
  if (!isProfileComplete(profile)) redirect("/onboarding");
  return profile;
}

export async function getActiveEventForMember() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("events").select("*").eq("is_active", true).limit(1).maybeSingle();
  if (error || !data) return null;
  return data as EventRecord;
}

export async function getBookingForUser(eventId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("bookings")
    .select("*")
    .eq("event_id", eventId)
    .eq("user_id", userId)
    .neq("status", "cancelled")
    .maybeSingle();

  return data as BookingRecord | null;
}

export async function listGalleryPhotos(eventId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("gallery_photos")
    .select("*")
    .eq("event_id", eventId)
    .order("created_at", { ascending: false });

  const rows = (data || []) as GalleryPhoto[];

  const signed = await Promise.all(
    rows.map(async (photo) => {
      const { data: urlData } = await supabase.storage.from("gallery").createSignedUrl(photo.storage_path, 60 * 30);
      return { ...photo, signedUrl: urlData?.signedUrl || "" };
    })
  );

  return signed;
}

export async function ensureSeededAdmin(userId: string, email?: string | null) {
  if (!email || !hasServiceRoleKey()) return;

  const allowedEmails = getInitialAdminEmails();
  if (!allowedEmails.includes(email.toLowerCase())) return;

  const supabase = createAdminClient();
  await supabase.from("admin_memberships").upsert({ user_id: userId }, { onConflict: "user_id" });
}

export async function requireAdmin() {
  const user = await requireVerifiedUser();
  await ensureSeededAdmin(user.id, user.email);

  const supabase = await createClient();
  const { data } = await supabase.from("admin_memberships").select("user_id").eq("user_id", user.id).maybeSingle();

  if (!data) redirect("/dashboard?error=Du bist kein Admin.");
  return user;
}

export async function getAdminOverview() {
  const supabase = await createClient();

  const [events, profiles, bookings] = await Promise.all([
    supabase.from("events").select("*").order("starts_on", { ascending: false }),
    supabase.from("profiles").select("*").order("created_at", { ascending: false }),
    supabase
      .from("bookings")
      .select("*, profiles(first_name,last_name,hometown)")
      .order("created_at", { ascending: false })
  ]);

  return {
    events: (events.data || []) as EventRecord[],
    profiles: (profiles.data || []) as ProfileRecord[],
    bookings: (bookings.data || []) as BookingWithProfile[]
  };
}
