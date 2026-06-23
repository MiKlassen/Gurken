import type { BookingStatus } from "@/lib/types";

const labels: Record<BookingStatus, string> = {
  pending_payment: "Zahlung offen",
  paid: "Bezahlt",
  waitlisted: "Warteliste",
  cancelled: "Storniert"
};

export function StatusBadge({ status }: { status: BookingStatus }) {
  return <span className={`status status-${status}`}>{labels[status]}</span>;
}
