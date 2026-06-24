import { redirect } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { BookingConfirmation } from "@/components/booking-confirmation";
import { BrandHeader } from "@/components/brand-header";
import { getActiveEventForMember, getBookingForUser, getCurrentProfile, getIsAdmin, requireCompleteProfile, requireVerifiedUser } from "@/lib/data";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

export default async function BookingConfirmationPage({ searchParams }: { searchParams: SearchParams }) {
  const user = await requireVerifiedUser();
  await requireCompleteProfile(user.id);
  const [params, isAdmin, event, profile] = await Promise.all([
    searchParams,
    getIsAdmin(user.id, user.email),
    getActiveEventForMember(),
    getCurrentProfile(user.id)
  ]);
  const message = typeof params.message === "string" ? params.message : "";

  if (!event) redirect("/book?error=Kein aktives Treffen gefunden.");

  const booking = await getBookingForUser(event.id, user.id);
  if (!booking) redirect("/book");

  return (
    <main className="app-shell">
      <BrandHeader isAuthed isAdmin={isAdmin} />
      <section className="page-heading">
        <CheckCircle2 size={34} />
        <div>
          <h1>Buchungsbestätigung</h1>
          <p>Deine Buchung ist gespeichert. Hier stehen Zeitraum, Betrag, Zahlung und Bierkastenpflicht zusammengefasst.</p>
        </div>
      </section>
      {message ? <p className="notice success">{message}</p> : null}
      <BookingConfirmation event={event} booking={booking} profile={profile} />
    </main>
  );
}
