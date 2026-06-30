"use client";

import { useEffect, useMemo, useState } from "react";
import { Beer, CalendarCheck, Moon } from "lucide-react";
import { submitBookingAction } from "@/app/actions/booking";
import { SubmitButton } from "@/components/submit-button";
import { calculateBookingAmount } from "@/lib/booking";
import { beerCrateLabel, bookingPaymentSummary } from "@/lib/booking-summary";
import { datesBetween, formatCurrency, formatDate, formatParticipantCount, formatWeekdayDate } from "@/lib/format";
import type { BookingMode, BookingRecord, EventRecord } from "@/lib/types";

function splitExpectedArrival(value: string | null | undefined) {
  const [date = "", timeValue = ""] = value?.split("T") || [];
  return {
    date,
    time: timeValue.slice(0, 5) || "15:00"
  };
}

export function BookingForm({ event, booking }: { event: EventRecord; booking: BookingRecord | null }) {
  const initialExpectedArrival = splitExpectedArrival(booking?.expected_arrival_at);
  const [mode, setMode] = useState<BookingMode>(booking?.mode || "overnight");
  const [arrivalDate, setArrivalDate] = useState(booking?.arrival_date || event.starts_on);
  const [departureDate, setDepartureDate] = useState(booking?.departure_date || event.ends_on);
  const [dayGuestDates, setDayGuestDates] = useState<string[]>(booking?.day_guest_dates || [event.starts_on]);
  const [participantCount, setParticipantCount] = useState(booking?.participant_count || 1);
  const [expectedArrivalDate, setExpectedArrivalDate] = useState(initialExpectedArrival.date || event.starts_on);
  const [expectedArrivalTime, setExpectedArrivalTime] = useState(initialExpectedArrival.time);
  const eventDays = useMemo(() => datesBetween(event.starts_on, event.ends_on), [event.starts_on, event.ends_on]);
  const expectedArrivalDays = useMemo(() => {
    if (mode === "overnight") return datesBetween(arrivalDate, departureDate);
    return eventDays.filter((day) => dayGuestDates.includes(day));
  }, [arrivalDate, dayGuestDates, departureDate, eventDays, mode]);
  const amount = calculateBookingAmount(event, { mode, arrivalDate, departureDate, dayGuestDates, participantCount });
  const paymentPreview = booking ? { amount_cents: amount, paid_amount_cents: booking.paid_amount_cents } : null;

  useEffect(() => {
    if (!expectedArrivalDays.length) return;
    setExpectedArrivalDate((current) => (expectedArrivalDays.includes(current) ? current : expectedArrivalDays[0]));
  }, [expectedArrivalDays]);

  return (
    <form className="form-panel booking-panel" action={submitBookingAction}>
      <input type="hidden" name="eventId" value={event.id} />
      <input type="hidden" name="mode" value={mode} />
      {booking ? <input type="hidden" name="bookingId" value={booking.id} /> : null}

      <div className="segmented" aria-label="Buchungsart">
        <button className={mode === "overnight" ? "active" : ""} type="button" onClick={() => setMode("overnight")}>
          <Moon size={18} /> Mit Übernachtung
        </button>
        <button className={mode === "day_guest" ? "active" : ""} type="button" onClick={() => setMode("day_guest")}>
          <CalendarCheck size={18} /> Tagesgast
        </button>
      </div>

      <label>
        Personen
        <select
          name="participantCount"
          value={participantCount}
          onChange={(event) => setParticipantCount(Number.parseInt(event.target.value, 10))}
          required
        >
          <option value={1}>Ich komme alleine</option>
          <option value={2}>Ich komme mit einer zweiten Person</option>
          <option value={3}>Ich komme mit zwei weiteren Personen</option>
        </select>
      </label>

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
              required
            />
          </label>
        </div>
      ) : (
        <fieldset className="day-grid">
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

      <fieldset className="address-fieldset">
        <legend>Ankunft</legend>
        <div className="form-grid two">
          <label>
            Wann kommst du ungefähr an?
            <select
              name="expectedArrivalDate"
              value={expectedArrivalDate}
              onChange={(event) => setExpectedArrivalDate(event.target.value)}
              disabled={!expectedArrivalDays.length}
              required
            >
              {expectedArrivalDays.length ? (
                expectedArrivalDays.map((day) => (
                  <option key={day} value={day}>
                    {formatWeekdayDate(day)}
                  </option>
                ))
              ) : (
                <option value="">Erst Buchungstage auswählen</option>
              )}
            </select>
          </label>
          <label>
            Uhrzeit
            <input
              name="expectedArrivalTime"
              type="time"
              step={900}
              value={expectedArrivalTime}
              onChange={(event) => setExpectedArrivalTime(event.target.value)}
              required
            />
          </label>
        </div>
        <p className="form-hint">
          Die auswählbaren Ankunftstage richten sich nach deinen gebuchten Tagen. Eine ungefähre Uhrzeit reicht.
        </p>
      </fieldset>

      <label>
        Bierkasten aus welcher Region?
        <input
          name="beerCrateRegion"
          defaultValue={booking?.beer_crate_region || ""}
          placeholder="z.B. Franken, Ruhrpott, Tirol..."
        />
      </label>

      <div className="booking-total">
        <div>
          <span>Betrag</span>
          <strong>{formatCurrency(amount)}</strong>
        </div>
        <p>
          <Beer size={18} /> {beerCrateLabel(participantCount)} für {formatParticipantCount(participantCount)},
          Bierkastenpflicht pro Person bleibt Ehrensache und Pflicht.
        </p>
      </div>

      {paymentPreview?.paid_amount_cents ? (
        <p className="notice success">
          Zahlung bisher: {bookingPaymentSummary(paymentPreview)} Änderungen werden mit deiner bestätigten Zahlung verrechnet.
        </p>
      ) : null}

      <SubmitButton pendingLabel="Buchung wird gespeichert...">
        {booking ? "Buchung ändern" : "Buchung speichern"}
      </SubmitButton>
    </form>
  );
}
