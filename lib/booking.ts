import { calculateNights } from "@/lib/format";
import type { BookingMode, EventRecord } from "@/lib/types";

export function calculateBookingAmount(
  event: Pick<EventRecord, "overnight_price_cents" | "day_guest_price_cents">,
  input: {
    mode: BookingMode;
    arrivalDate?: string;
    departureDate?: string;
    dayGuestDates?: string[];
  }
) {
  if (input.mode === "overnight") {
    if (!input.arrivalDate || !input.departureDate) return 0;
    return calculateNights(input.arrivalDate, input.departureDate) * event.overnight_price_cents;
  }

  return (input.dayGuestDates?.length || 0) * event.day_guest_price_cents;
}
