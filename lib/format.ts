export function formatCurrency(cents: number) {
  return new Intl.NumberFormat("de-DE", {
    style: "currency",
    currency: "EUR"
  }).format(cents / 100);
}

export function formatDate(date: string | null | undefined) {
  if (!date) return "offen";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric"
  }).format(new Date(`${date}T12:00:00`));
}

export function formatDateTime(date: string | null | undefined) {
  if (!date) return "offen";
  return new Intl.DateTimeFormat("de-DE", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit"
  }).format(new Date(date));
}

export function formatParticipantCount(count: number | null | undefined) {
  const normalized = count || 1;
  return normalized === 1 ? "1 Person" : `${normalized} Personen`;
}

export function datesBetween(start: string, end: string) {
  const result: string[] = [];
  const cursor = new Date(`${start}T12:00:00`);
  const last = new Date(`${end}T12:00:00`);

  while (cursor <= last) {
    result.push(cursor.toISOString().slice(0, 10));
    cursor.setDate(cursor.getDate() + 1);
  }

  return result;
}

export function calculateNights(arrival: string, departure: string) {
  const start = new Date(`${arrival}T12:00:00`).getTime();
  const end = new Date(`${departure}T12:00:00`).getTime();
  return Math.max(0, Math.round((end - start) / 86_400_000));
}
