"use client";

import { useMemo, useState } from "react";
import { Clock, UsersRound } from "lucide-react";
import { formatDate, formatParticipantCount } from "@/lib/format";

export type AttendanceArrival = {
  name: string;
  time: string;
  participantCount: number;
};

export type AttendanceDay = {
  date: string;
  overnight: number;
  dayGuests: number;
  total: number;
  waitlisted: number;
  arrivals: AttendanceArrival[];
};

function weekday(date: string) {
  return new Intl.DateTimeFormat("de-DE", { weekday: "long" }).format(new Date(`${date}T12:00:00`));
}

export function AttendanceMap({ days, memberLimit }: { days: AttendanceDay[]; memberLimit: number }) {
  const initialDate = useMemo(() => days.find((day) => day.arrivals.length)?.date || days[0]?.date || "", [days]);
  const [selectedDate, setSelectedDate] = useState(initialDate);
  const selectedDay = days.find((day) => day.date === selectedDate) || days[0];

  return (
    <>
      <div className="table-wrap">
        <table className="occupancy-table">
          <thead>
            <tr>
              <th>Tag</th>
              <th>Datum</th>
              <th>Übernachtung</th>
              <th>Tagesgäste</th>
              <th>Gesamt</th>
              <th>Warteliste</th>
              <th>Anreisen</th>
              <th>Auslastung</th>
            </tr>
          </thead>
          <tbody>
            {days.map((day) => {
              const occupancyPercent = memberLimit > 0 ? Math.min(100, (day.total / memberLimit) * 100) : 0;
              const selected = day.date === selectedDay?.date;

              return (
                <tr className={selected ? "attendance-row-selected" : ""} key={day.date}>
                  <td>
                    <button className="day-select-button" type="button" onClick={() => setSelectedDate(day.date)}>
                      {weekday(day.date)}
                    </button>
                  </td>
                  <td>{formatDate(day.date)}</td>
                  <td>{formatParticipantCount(day.overnight)}</td>
                  <td>{formatParticipantCount(day.dayGuests)}</td>
                  <td>
                    <strong>{formatParticipantCount(day.total)}</strong>
                  </td>
                  <td>{day.waitlisted ? formatParticipantCount(day.waitlisted) : "-"}</td>
                  <td>
                    {day.arrivals.length ? (
                      <button className="arrival-summary-button" type="button" onClick={() => setSelectedDate(day.date)}>
                        <Clock size={16} />
                        {day.arrivals.length} Anreisen
                      </button>
                    ) : (
                      "-"
                    )}
                  </td>
                  <td>
                    <div className="occupancy-cell">
                      <div className="occupancy-track" aria-hidden="true">
                        <span style={{ width: `${occupancyPercent}%` }} />
                      </div>
                      <span>
                        {day.total} / {memberLimit}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {selectedDay ? (
        <section className="attendance-day-panel" aria-live="polite">
          <div className="attendance-day-head">
            <div>
              <span>{formatDate(selectedDay.date)}</span>
              <h3>{weekday(selectedDay.date)}</h3>
            </div>
            <div className="attendance-day-stats">
              <span>{formatParticipantCount(selectedDay.total)} gesamt</span>
              <span>{formatParticipantCount(selectedDay.overnight)} über Nacht</span>
              <span>{formatParticipantCount(selectedDay.dayGuests)} Tagesgäste</span>
            </div>
          </div>

          <div className="attendance-day-graphic">
            <div className="attendance-day-meter">
              <UsersRound size={20} />
              <div>
                <strong>{selectedDay.total} / {memberLimit}</strong>
                <span>Auslastung</span>
              </div>
              <div className="occupancy-track" aria-hidden="true">
                <span style={{ width: `${memberLimit > 0 ? Math.min(100, (selectedDay.total / memberLimit) * 100) : 0}%` }} />
              </div>
            </div>

            <div className="arrival-timeline">
              {selectedDay.arrivals.length ? (
                selectedDay.arrivals.map((arrival, index) => (
                  <article className="arrival-timeline-item" key={`${selectedDay.date}-${arrival.name}-${arrival.time}-${index}`}>
                    <div className="arrival-time">{arrival.time}</div>
                    <div className="arrival-dot" aria-hidden="true" />
                    <div className="arrival-card">
                      <strong>{arrival.name}</strong>
                      <span>{formatParticipantCount(arrival.participantCount)}</span>
                    </div>
                  </article>
                ))
              ) : (
                <p className="notice-inline">Für diesen Tag ist noch keine konkrete Anreisezeit hinterlegt.</p>
              )}
            </div>
          </div>
        </section>
      ) : null}
    </>
  );
}
