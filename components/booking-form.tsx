"use client";

import { useMemo, useState } from "react";
import { Beer, CalendarCheck, Moon } from "lucide-react";
import { submitBookingAction } from "@/app/actions/booking";
import { SubmitButton } from "@/components/submit-button";
import { calculateBookingAmount } from "@/lib/booking";
import { datesBetween, formatCurrency, formatDate } from "@/lib/format";
import type { BookingMode, BookingRecord, EventRecord } from "@/lib/types";

export function BookingForm({ event, booking }: { event: EventRecord; booking: BookingRecord | null }) {
  const [mode, setMode] = useState<BookingMode>(booking?.mode || "overnight");
  const [arrivalDate, setArrivalDate] = useState(booking?.arrival_date || event.starts_on);
  const [departureDate, setDepartureDate] = useState(booking?.departure_date || event.ends_on);
  const [dayGuestDates, setDayGuestDates] = useState<string[]>(booking?.day_guest_dates || [event.starts_on]);
  const locked = booking?.status === "paid";
  const eventDays = useMemo(() => datesBetween(event.starts_on, event.ends_on), [event.starts_on, event.ends_on]);
  const amount = calculateBookingAmount(event, { mode, arrivalDate, departureDate, dayGuestDates });

  return (
    <form className="form-panel booking-panel" action={submitBookingAction}>
      <input type="hidden" name="eventId" value={event.id} />
      <input type="hidden" name="mode" value={mode} />

      <div className="segmented" aria-label="Buchungsart">
        <button className={mode === "overnight" ? "active" : ""} type="button" onClick={() => setMode("overnight")}>
          <Moon size={18} /> Mit Übernachtung
        </button>
        <button className={mode === "day_guest" ? "active" : ""} type="button" onClick={() => setMode("day_guest")}>
          <CalendarCheck size={18} /> Tagesgast
        </button>
      </div>

      {mode === "overnight" ? (
        <div className="form-grid two">
          <label>
            Anreise
            <input
              type="date"
              name="arrivalDate"
              min={event.starts_on}
              max={event.ends_on}
              value={arrivalDate}
              onChange={(event) => setArrivalDate(event.target.value)}
              disabled={locked}
              required
            />
          </label>
          <label>
            Abreise
            <input
              type="date"
              name="departureDate"
              min={event.starts_on}
              max={event.ends_on}
              value={departureDate}
              onChange={(event) => setDepartureDate(event.target.value)}
              disabled={locked}
              required
            />
          </label>
        </div>
      ) : (
        <fieldset className="day-grid" disabled={locked}>
          <legend>Tage auswählen</legend>
          {eventDays.map((day) => (
            <label key={day} className="check-tile">
              <input
                type="checkbox"
                name="dayGuestDates"
                value={day}
                checked={dayGuestDates.includes(day)}
                onChange={(changeEvent) => {
                  setDayGuestDates((current) =>
                    changeEvent.target.checked ? [...current, day] : current.filter((value) => value !== day)
                  );
                }}
              />
              <span>{formatDate(day)}</span>
            </label>
          ))}
        </fieldset>
      )}

      <label>
        Bierkasten aus welcher Region?
        <input
          name="beerCrateRegion"
          defaultValue={booking?.beer_crate_region || ""}
          placeholder="z.B. Franken, Ruhrpott, Tirol..."
          disabled={locked}
        />
      </label>

      <div className="booking-total">
        <div>
          <span>Aktueller Betrag</span>
          <strong>{formatCurrency(amount)}</strong>
        </div>
        <p>
          <Beer size={18} /> Bierkastenpflicht pro Person bleibt Ehrensache und Pflicht.
        </p>
      </div>

      {locked ? (
        <p className="notice success">Diese Buchung ist bezahlt und kann nur noch durch Admins geändert werden.</p>
      ) : (
        <SubmitButton pendingLabel="Buchung wird gespeichert...">Buchung speichern</SubmitButton>
      )}
    </form>
  );
}
