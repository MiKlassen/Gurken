"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { sendBookingConfirmationEmail } from "@/lib/booking-confirmation-mail";
import { requireCompleteProfile, requireVerifiedUser } from "@/lib/data";
import { datesBetween } from "@/lib/format";
import { decryptBookingFields, encryptBeerCrateRegion, encryptBookingExpectedArrival } from "@/lib/personal-data";
import { createClient } from "@/lib/supabase/server";
import type { BookingMode, BookingRecord, EventRecord } from "@/lib/types";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function int(formData: FormData, key: string) {
  const number = Number.parseInt(text(formData, key), 10);
  return Number.isNaN(number) ? 0 : number;
}

function isIsoDate(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isTime(value: string) {
  if (!/^\d{2}:\d{2}$/.test(value)) return false;
  const [hours, minutes] = value.split(":").map((part) => Number.parseInt(part, 10));
  return hours >= 0 && hours <= 23 && minutes >= 0 && minutes <= 59;
}

export async function submitBookingAction(formData: FormData) {
  const user = await requireVerifiedUser();
  const profile = await requireCompleteProfile(user.id);

  const eventId = text(formData, "eventId");
  const bookingId = text(formData, "bookingId");
  const mode = text(formData, "mode") as BookingMode;
  const participantCount = int(formData, "participantCount");
  const beerCrateRegion = text(formData, "beerCrateRegion");
  const arrivalDate = text(formData, "arrivalDate") || null;
  const departureDate = text(formData, "departureDate") || null;
  const expectedArrivalDate = text(formData, "expectedArrivalDate");
  const expectedArrivalTime = text(formData, "expectedArrivalTime");
  const dayGuestDates = formData
    .getAll("dayGuestDates")
    .map((value) => (typeof value === "string" ? value.trim() : ""))
    .filter(Boolean);

  const errorRedirectBase = bookingId ? "/book?bearbeiten=1&error=" : "/book?error=";
  const redirectWithError = (message: string): never => redirect(`${errorRedirectBase}${encodeURIComponent(message)}`);

  if (!eventId || !["overnight", "day_guest"].includes(mode)) redirectWithError("Die Buchung ist unvollständig.");

  if (participantCount < 1 || participantCount > 3) {
    redirectWithError("Bitte gib an, ob du alleine, zu zweit oder zu dritt kommst.");
  }

  if (!isIsoDate(expectedArrivalDate) || !isTime(expectedArrivalTime)) {
    redirectWithError("Bitte gib deinen ungefähren Ankunftstag und eine Uhrzeit an.");
  }

  const bookedArrivalDays =
    mode === "overnight" && arrivalDate && departureDate ? datesBetween(arrivalDate, departureDate) : dayGuestDates;

  if (!bookedArrivalDays.includes(expectedArrivalDate)) {
    redirectWithError("Der Ankunftstag muss zu deinen gebuchten Tagen passen.");
  }

  let encryptedBeerCrateRegion: string | null = null;
  let encryptedExpectedArrivalAt: string | null = null;
  try {
    encryptedBeerCrateRegion = encryptBeerCrateRegion(beerCrateRegion);
    encryptedExpectedArrivalAt = encryptBookingExpectedArrival(`${expectedArrivalDate}T${expectedArrivalTime}`);
  } catch (error) {
    redirectWithError(error instanceof Error ? error.message : "Verschlüsselung fehlgeschlagen.");
  }

  if (encryptedBeerCrateRegion === null && beerCrateRegion) redirectWithError("Verschlüsselung fehlgeschlagen.");
  if (!encryptedExpectedArrivalAt) redirectWithError("Verschlüsselung fehlgeschlagen.");

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("upsert_booking_v2", {
    p_event_id: eventId,
    p_mode: mode,
    p_arrival_date: arrivalDate,
    p_departure_date: departureDate,
    p_day_guest_dates: dayGuestDates.length ? dayGuestDates : null,
    p_participant_count: participantCount,
    p_beer_crate_region: encryptedBeerCrateRegion,
    p_expected_arrival_at: encryptedExpectedArrivalAt,
    p_expected_arrival_date: expectedArrivalDate
  });

  if (error || !data) redirectWithError(error?.message || "Buchung fehlgeschlagen.");

  const booking = decryptBookingFields(data as BookingRecord);
  const { data: eventData } = await supabase.from("events").select("*").eq("id", eventId).maybeSingle();
  let message = "Buchung gespeichert.";

  if (eventData) {
    try {
      const result = await sendBookingConfirmationEmail({
        email: user.email,
        event: eventData as EventRecord,
        booking,
        profile
      });
      if (result.sent) message = "Buchung gespeichert. Bestätigung wurde per Mail verschickt.";
    } catch (mailError) {
      console.error("Booking confirmation mail failed", mailError);
      message = "Buchung gespeichert. Die Bestätigungs-Mail konnte nicht versendet werden.";
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/book");
  revalidatePath("/book/confirmation");
  redirect(`/book/confirmation?message=${encodeURIComponent(message)}`);
}
