import { Bed, CalendarDays, ClipboardList, UsersRound } from "lucide-react";
import { saveRoomAssignmentAction } from "@/app/actions/admin";
import { AttendanceMap } from "@/components/attendance-map";
import { BrandHeader } from "@/components/brand-header";
import { SubmitButton } from "@/components/submit-button";
import { demoEvent, getAdminOverview, requireAdmin } from "@/lib/data";
import { datesBetween, formatDate, formatParticipantCount } from "@/lib/format";
import type { BookingRecord, BookingWithProfile, EventRecord, EventRoomAssignmentRecord, EventRoomRecord } from "@/lib/types";

export const dynamic = "force-dynamic";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

type OccupancyDay = {
  date: string;
  overnight: number;
  dayGuests: number;
  total: number;
  waitlisted: number;
  arrivals: ArrivalHint[];
};

type ArrivalHint = {
  name: string;
  time: string;
  participantCount: number;
};

function bookingTouchesDate(booking: BookingRecord, date: string) {
  if (booking.mode === "overnight") {
    return Boolean(booking.arrival_date && booking.departure_date && date >= booking.arrival_date && date <= booking.departure_date);
  }

  return Boolean(booking.day_guest_dates?.includes(date));
}

function bookingParticipantsForDate(booking: BookingRecord, date: string) {
  return bookingTouchesDate(booking, date) ? booking.participant_count || 1 : 0;
}

function expectedArrivalDate(value: string | null | undefined) {
  return value?.slice(0, 10) || null;
}

function expectedArrivalTime(value: string | null | undefined) {
  const time = value?.split("T")[1]?.slice(0, 5);
  return time ? `${time} Uhr` : "ohne Uhrzeit";
}

function profileName(booking: BookingWithProfile) {
  const firstName = booking.profiles?.first_name || "?";
  const lastName = booking.profiles?.last_name || "";
  return `${firstName} ${lastName}`.trim();
}

function roomType(room: EventRoomRecord) {
  if (room.is_multi_bed) return "Mehrbettzimmer";
  return room.bed_count === 1 ? "Einzelzimmer" : "Zimmer";
}

function bookingStay(booking: BookingRecord) {
  return `${formatDate(booking.arrival_date)} bis ${formatDate(booking.departure_date)}`;
}

function roomBookingRows(room: EventRoomRecord, assignments: EventRoomAssignmentRecord[], bookingsById: Map<string, BookingWithProfile>) {
  return assignments
    .filter((assignment) => assignment.room_id === room.id)
    .map((assignment) => bookingsById.get(assignment.booking_id))
    .filter((booking): booking is BookingWithProfile => Boolean(booking));
}

function buildOccupancyPlan(event: EventRecord, bookings: BookingWithProfile[]): OccupancyDay[] {
  const eventBookings = bookings.filter((booking) => booking.event_id === event.id && booking.status !== "cancelled");

  return datesBetween(event.starts_on, event.ends_on).map((date) => {
    const activeBookings = eventBookings.filter((booking) => booking.status === "pending_payment" || booking.status === "paid");
    const waitlistedBookings = eventBookings.filter((booking) => booking.status === "waitlisted");

    const overnight = activeBookings
      .filter((booking) => booking.mode === "overnight")
      .reduce((sum, booking) => sum + bookingParticipantsForDate(booking, date), 0);
    const dayGuests = activeBookings
      .filter((booking) => booking.mode === "day_guest")
      .reduce((sum, booking) => sum + bookingParticipantsForDate(booking, date), 0);
    const waitlisted = waitlistedBookings.reduce((sum, booking) => sum + bookingParticipantsForDate(booking, date), 0);
    const arrivals = activeBookings
      .filter((booking) => bookingTouchesDate(booking, date) && expectedArrivalDate(booking.profiles?.expected_arrival_at) === date)
      .sort((left, right) => (left.profiles?.expected_arrival_at || "").localeCompare(right.profiles?.expected_arrival_at || ""))
      .map((booking) => ({
        name: profileName(booking),
        time: expectedArrivalTime(booking.profiles?.expected_arrival_at),
        participantCount: booking.participant_count || 1
      }));

    return {
      date,
      overnight,
      dayGuests,
      total: overnight + dayGuests,
      waitlisted,
      arrivals
    };
  });
}

export default async function EventPage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin();
  const params = await searchParams;
  const error = typeof params.error === "string" ? params.error : "";
  const message = typeof params.message === "string" ? params.message : "";
  const { events, bookings, rooms, roomAssignments } = await getAdminOverview();
  const activeEvent = events.find((event) => event.is_active) || events[0] || demoEvent;
  const occupancyPlan = buildOccupancyPlan(activeEvent, bookings);
  const activeRooms = rooms.filter((room) => room.event_id === activeEvent.id);
  const activeRoomIds = new Set(activeRooms.map((room) => room.id));
  const overnightBookings = bookings.filter(
    (booking) =>
      booking.event_id === activeEvent.id &&
      booking.mode === "overnight" &&
      (booking.status === "pending_payment" || booking.status === "paid")
  );
  const overnightBookingsById = new Map(overnightBookings.map((booking) => [booking.id, booking]));
  const activeRoomAssignments = roomAssignments.filter(
    (assignment) => activeRoomIds.has(assignment.room_id) && overnightBookingsById.has(assignment.booking_id)
  );
  const assignedBookingIds = new Set(activeRoomAssignments.map((assignment) => assignment.booking_id));
  const unassignedBookings = overnightBookings.filter((booking) => !assignedBookingIds.has(booking.id));
  const peak = occupancyPlan.reduce((max, day) => Math.max(max, day.total), 0);
  const overnightPeak = occupancyPlan.reduce((max, day) => Math.max(max, day.overnight), 0);
  const waitlistTotal = occupancyPlan.reduce((sum, day) => sum + day.waitlisted, 0);
  const freeAtPeak = Math.max(activeEvent.member_limit - peak, 0);
  const totalBeds = activeRooms.reduce((sum, room) => sum + room.bed_count, 0);
  const assignedBeds = activeRoomAssignments.reduce((sum, assignment) => {
    const booking = overnightBookingsById.get(assignment.booking_id);
    return sum + (booking?.participant_count || 0);
  }, 0);
  const freeBedsAtPeak = totalBeds - overnightPeak;

  return (
    <main className="app-shell">
      <BrandHeader isAuthed isAdmin />
      <section className="page-heading">
        <ClipboardList size={34} />
        <div>
          <h1>Event</h1>
          <p>{activeEvent.subject || activeEvent.name}</p>
        </div>
      </section>
      {error ? <p className="notice error">{error}</p> : null}
      {message ? <p className="notice success">{message}</p> : null}

      <section className="event-metrics" aria-label="Eventkennzahlen">
        <article className="panel">
          <CalendarDays />
          <h2>Zeitraum</h2>
          <p>
            {formatDate(activeEvent.starts_on)} bis {formatDate(activeEvent.ends_on)}
          </p>
        </article>
        <article className="panel">
          <UsersRound />
          <h2>Spitze</h2>
          <p>{formatParticipantCount(peak)}</p>
          <span>{formatParticipantCount(freeAtPeak)} frei am stärksten Tag</span>
        </article>
        <article className="panel">
          <UsersRound />
          <h2>Limit</h2>
          <p>{formatParticipantCount(activeEvent.member_limit)}</p>
        </article>
        <article className="panel">
          <UsersRound />
          <h2>Warteliste</h2>
          <p>{formatParticipantCount(waitlistTotal)}</p>
          <span>über alle Tage summiert</span>
        </article>
      </section>

      <section className="panel table-panel">
        <div className="section-title-row">
          <div>
            <h2>Anwesenheitskarte</h2>
            <p className="small-text">Zahlung offen und bezahlt zählen als Belegung. Warteliste läuft separat.</p>
          </div>
          <div className="admin-metrics">
            <span>{occupancyPlan.length} Tage</span>
            <span>{peak} / {activeEvent.member_limit} Spitze</span>
          </div>
        </div>
        <AttendanceMap days={occupancyPlan} memberLimit={activeEvent.member_limit} />
      </section>

      <section className="panel room-plan-panel">
        <div className="section-title-row">
          <div>
            <h2>Zimmerbelegungsplan</h2>
            <p className="small-text">Zimmerkapazität des aktiven Treffens auf Basis der Übernachtungsbuchungen.</p>
          </div>
          <div className="admin-metrics">
            <span>{activeRooms.length} Zimmer</span>
            <span>{totalBeds} Betten</span>
            <span>{formatParticipantCount(overnightPeak)} Spitze nachts</span>
            <span>{formatParticipantCount(assignedBeds)} zugeteilt</span>
            <span className={freeBedsAtPeak < 0 ? "metric-warning" : ""}>
              {freeBedsAtPeak < 0 ? `${Math.abs(freeBedsAtPeak)} Betten fehlen` : `${freeBedsAtPeak} Betten frei`}
            </span>
          </div>
        </div>
        {activeRooms.length ? (
          <div className="room-plan-grid">
            {activeRooms.map((room) => {
              const roomBookings = roomBookingRows(room, activeRoomAssignments, overnightBookingsById);
              const occupiedBeds = roomBookings.reduce((sum, booking) => sum + (booking.participant_count || 1), 0);
              const roomPercent = room.bed_count > 0 ? Math.min(100, (occupiedBeds / room.bed_count) * 100) : 0;
              const overbooked = occupiedBeds > room.bed_count;

              return (
                <article className={overbooked ? "room-plan-card room-plan-card-overbooked" : "room-plan-card"} key={room.id}>
                  <div className="room-plan-head">
                    <div>
                      <h3>{room.name}</h3>
                      <span>{roomType(room)}</span>
                    </div>
                    <Bed size={26} />
                  </div>
                  <p className="bed-count">
                    {occupiedBeds} / {room.bed_count} {room.bed_count === 1 ? "Bett" : "Betten"}
                  </p>
                  <div className="occupancy-track" aria-hidden="true">
                    <span style={{ width: `${roomPercent}%` }} />
                  </div>
                  {room.notes ? <p className="small-text">{room.notes}</p> : null}
                  {overbooked ? <span className="role-pill room-warning">Überbelegt</span> : null}
                  <ul className="room-occupant-list">
                    {roomBookings.length ? (
                      roomBookings.map((booking) => (
                        <li key={booking.id}>
                          <div>
                            <strong>{profileName(booking)}</strong>
                            <span>
                              {formatParticipantCount(booking.participant_count)} · {bookingStay(booking)}
                            </span>
                          </div>
                          <form className="room-assignment-form" action={saveRoomAssignmentAction}>
                            <input type="hidden" name="bookingId" value={booking.id} />
                            <select name="roomId" defaultValue={room.id} aria-label={`Zimmer für ${profileName(booking)}`}>
                              <option value="">Nicht zugeteilt</option>
                              {activeRooms.map((option) => (
                                <option key={option.id} value={option.id}>
                                  {option.name}
                                </option>
                              ))}
                            </select>
                            <SubmitButton className="button secondary small" pendingLabel="Speichert...">
                              Speichern
                            </SubmitButton>
                          </form>
                        </li>
                      ))
                    ) : (
                      <li>
                        <span className="small-text">Noch keine Buchung zugeteilt.</span>
                      </li>
                    )}
                  </ul>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="notice-inline">Noch keine Zimmer in den Ortseinstellungen angelegt.</p>
        )}

        {activeRooms.length && unassignedBookings.length ? (
          <div className="room-unassigned">
            <h3>Nicht zugeteilt</h3>
            <div className="room-assignment-list">
              {unassignedBookings.map((booking) => (
                <form className="room-assignment-row" action={saveRoomAssignmentAction} key={booking.id}>
                  <input type="hidden" name="bookingId" value={booking.id} />
                  <div>
                    <strong>{profileName(booking)}</strong>
                    <span>
                      {formatParticipantCount(booking.participant_count)} · {bookingStay(booking)}
                    </span>
                  </div>
                  <select name="roomId" defaultValue="" aria-label={`Zimmer für ${profileName(booking)}`}>
                    <option value="">Nicht zugeteilt</option>
                    {activeRooms.map((room) => (
                      <option key={room.id} value={room.id}>
                        {room.name}
                      </option>
                    ))}
                  </select>
                  <SubmitButton className="button secondary small" pendingLabel="Speichert...">
                    Zuteilen
                  </SubmitButton>
                </form>
              ))}
            </div>
          </div>
        ) : null}

        {activeRooms.length && !overnightBookings.length ? (
          <p className="notice-inline">Noch keine aktiven Übernachtungsbuchungen für den Zimmerplan.</p>
        ) : null}
      </section>
    </main>
  );
}
