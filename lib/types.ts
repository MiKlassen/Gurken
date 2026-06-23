export type EventRecord = {
  id: string;
  year: number;
  name: string;
  slug: string;
  is_active: boolean;
  starts_on: string;
  ends_on: string;
  public_summary: string;
  location_label: string;
  location_details: string;
  member_limit: number;
  overnight_price_cents: number;
  day_guest_price_cents: number;
  payment_iban: string | null;
  payment_paypal_url: string | null;
  payment_note: string | null;
};

export type ProfileRecord = {
  user_id: string;
  first_name: string | null;
  last_name: string | null;
  hometown: string | null;
  created_at: string;
  updated_at: string;
};

export type BookingStatus = "pending_payment" | "paid" | "waitlisted" | "cancelled";
export type BookingMode = "overnight" | "day_guest";

export type BookingRecord = {
  id: string;
  event_id: string;
  user_id: string;
  mode: BookingMode;
  arrival_date: string | null;
  departure_date: string | null;
  day_guest_dates: string[] | null;
  amount_cents: number;
  status: BookingStatus;
  beer_crate_region: string | null;
  created_at: string;
  updated_at: string;
};

export type GalleryPhoto = {
  id: string;
  event_id: string;
  user_id: string;
  storage_path: string;
  caption: string | null;
  created_at: string;
};

export type BookingWithProfile = BookingRecord & {
  profiles: Pick<ProfileRecord, "first_name" | "last_name" | "hometown"> | null;
};
