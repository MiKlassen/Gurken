"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCompleteProfile, requireVerifiedUser } from "@/lib/data";
import { encryptBeerCrateRegion } from "@/lib/personal-data";
import { createClient } from "@/lib/supabase/server";
import type { BookingMode } from "@/lib/types";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function int(formData: FormData, key: string) {
  const number = Number.parseInt(text(formData, key), 10);
  return Number.isNaN(number) ? 0 : number;
}

export async function submitBookingAction(formData: FormData) {
  const user = await requireVerifiedUser();
  await requireCompleteProfile(user.id);

  const eventId = text(formData, "eventId");
  const mode = text(formData, "mode") as BookingMode;
  const participantCount = int(formData, "participantCount");
  const beerCrateRegion = text(formData, "beerCrateRegion");
  const arrivalDate = text(formData, "arrivalDate") || null;
  const departureDate = text(formData, "departureDate") || null;
  const dayGuestDates = formData
    .getAll("dayGuestDates")
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  if (!eventId || !["overnight", "day_guest"].includes(mode)) {
    redirect("/book?error=Die Buchung ist unvollständig.");
  }

  if (participantCount < 1 || participantCount > 3) {
    redirect("/book?error=Bitte gib an, ob du alleine, zu zweit oder zu dritt kommst.");
  }

  let encryptedBeerCrateRegion: string | null;
  try {
    encryptedBeerCrateRegion = encryptBeerCrateRegion(beerCrateRegion);
  } catch (error) {
    redirect(`/book?error=${encodeURIComponent(error instanceof Error ? error.message : "Verschlüsselung fehlgeschlagen.")}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("upsert_booking_v2", {
    p_event_id: eventId,
    p_mode: mode,
    p_arrival_date: arrivalDate,
    p_departure_date: departureDate,
    p_day_guest_dates: dayGuestDates.length ? dayGuestDates : null,
    p_participant_count: participantCount,
    p_beer_crate_region: encryptedBeerCrateRegion
  });

  if (error || !data) redirect(`/book?error=${encodeURIComponent(error?.message || "Buchung fehlgeschlagen.")}`);

  revalidatePath("/dashboard");
  redirect("/dashboard?message=Buchung gespeichert.");
}
