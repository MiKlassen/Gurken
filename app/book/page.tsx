import { CalendarDays } from "lucide-react";
import { BookingForm } from "@/components/booking-form";
import { BrandHeader } from "@/components/brand-header";
import { getActiveEventForMember, getBookingForUser, requireCompleteProfile, requireVerifiedUser } from "@/lib/data";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BookPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireVerifiedUser();
  await requireCompleteProfile(user.id);
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const event = await getActiveEventForMember();
  const booking = event ? await getBookingForUser(event.id, user.id) : null;

  return (
    <main className="app-shell">
      <BrandHeader isAuthed />
      <section className="page-heading">
        <CalendarDays size={34} />
        <div>
          <h1>Buchung</h1>
          <p>Zeitraum oder Tagesgast wählen, Betrag sehen, absenden und danach offline bezahlen.</p>
        </div>
      </section>
      {error ? <p className="notice error">{error}</p> : null}
      {event ? <BookingForm event={event} booking={booking} /> : <p className="notice error">Kein aktives Treffen gefunden.</p>}
    </main>
  );
}
