"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireCompleteProfile, requireVerifiedUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";
import type { BookingMode } from "@/lib/types";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function submitBookingAction(formData: FormData) {
  const user = await requireVerifiedUser();
  await requireCompleteProfile(user.id);

  const eventId = text(formData, "eventId");
  const mode = text(formData, "mode") as BookingMode;
  const beerCrateRegion = text(formData, "beerCrateRegion");
  const arrivalDate = text(formData, "arrivalDate") || null;
  const departureDate = text(formData, "departureDate") || null;
  const dayGuestDates = formData
    .getAll("dayGuestDates")
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  if (!eventId || !["overnight", "day_guest"].includes(mode)) {
    redirect("/book?error=Die Buchung ist unvollstaendig.");
  }

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("upsert_booking", {
    p_event_id: eventId,
    p_mode: mode,
    p_arrival_date: arrivalDate,
    p_departure_date: departureDate,
    p_day_guest_dates: dayGuestDates.length ? dayGuestDates : null,
    p_beer_crate_region: beerCrateRegion || null
  });

  if (error || !data) redirect(`/book?error=${encodeURIComponent(error?.message || "Buchung fehlgeschlagen.")}`);

  revalidatePath("/dashboard");
  redirect("/dashboard?message=Buchung gespeichert.");
}
