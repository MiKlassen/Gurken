import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto";
import type { BookingRecord, BookingWithProfile, GalleryPhoto, ProfileRecord } from "@/lib/types";

const ENCRYPTION_PREFIX = "enc:v1";
const PROFILE_FIRST_NAME_CONTEXT = "profiles.first_name";
const PROFILE_LAST_NAME_CONTEXT = "profiles.last_name";
const PROFILE_HOMETOWN_CONTEXT = "profiles.hometown";
const PROFILE_STREET_ADDRESS_CONTEXT = "profiles.street_address";
const PROFILE_POSTAL_CODE_CONTEXT = "profiles.postal_code";
const PROFILE_CITY_CONTEXT = "profiles.city";
const PROFILE_EXPECTED_ARRIVAL_CONTEXT = "profiles.expected_arrival_at";
const BOOKING_BEER_REGION_CONTEXT = "bookings.beer_crate_region";
const BOOKING_EXPECTED_ARRIVAL_CONTEXT = "bookings.expected_arrival_at";
const GALLERY_CAPTION_CONTEXT = "gallery_photos.caption";

function base64Url(buffer: Buffer) {
  return buffer.toString("base64url");
}

function fromBase64Url(value: string) {
  return Buffer.from(value, "base64url");
}

function decodeEncryptionKey(value: string) {
  const trimmed = value.trim();
  if (/^[a-f0-9]{64}$/i.test(trimmed)) return Buffer.from(trimmed, "hex");

  const normalized = trimmed.startsWith("base64:") ? trimmed.slice("base64:".length) : trimmed;
  const base64Key = Buffer.from(normalized, "base64url");
  if (base64Key.length === 32) return base64Key;

  const utf8Key = Buffer.from(trimmed, "utf8");
  if (utf8Key.length === 32) return utf8Key;

  return base64Key;
}

function getEncryptionKey() {
  const raw = process.env.PERSONAL_DATA_ENCRYPTION_KEY;
  if (!raw) {
    throw new Error("Missing PERSONAL_DATA_ENCRYPTION_KEY. Generate a 32-byte base64url key and set it only server-side.");
  }

  const key = decodeEncryptionKey(raw);
  if (key.length !== 32) {
    throw new Error("PERSONAL_DATA_ENCRYPTION_KEY must decode to exactly 32 bytes for AES-256-GCM.");
  }

  return key;
}

function isEncrypted(value: string) {
  return value.startsWith(`${ENCRYPTION_PREFIX}:`);
}

function encryptText(value: string | null | undefined, context: string) {
  const trimmed = value?.trim();
  if (!trimmed) return null;
  if (isEncrypted(trimmed)) return trimmed;

  const iv = randomBytes(12);
  const cipher = createCipheriv("aes-256-gcm", getEncryptionKey(), iv);
  cipher.setAAD(Buffer.from(context, "utf8"));
  const ciphertext = Buffer.concat([cipher.update(trimmed, "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();

  return `${ENCRYPTION_PREFIX}:${base64Url(iv)}:${base64Url(tag)}:${base64Url(ciphertext)}`;
}

function decryptText(value: string | null | undefined, context: string) {
  if (!value) return null;
  if (!isEncrypted(value)) return value;

  const parts = value.split(":");
  if (parts.length !== 5 || parts[0] !== "enc" || parts[1] !== "v1") {
    throw new Error("Invalid encrypted personal data envelope.");
  }

  const [, , ivValue, tagValue, ciphertextValue] = parts;
  const decipher = createDecipheriv("aes-256-gcm", getEncryptionKey(), fromBase64Url(ivValue));
  decipher.setAAD(Buffer.from(context, "utf8"));
  decipher.setAuthTag(fromBase64Url(tagValue));

  return Buffer.concat([decipher.update(fromBase64Url(ciphertextValue)), decipher.final()]).toString("utf8");
}

type ProfilePersonalFields = Pick<ProfileRecord, "first_name" | "last_name" | "hometown" | "street_address" | "postal_code" | "city"> &
  Partial<Pick<ProfileRecord, "expected_arrival_at">>;

export function encryptProfileFields(input: ProfilePersonalFields) {
  const encrypted = {
    first_name: encryptText(input.first_name, PROFILE_FIRST_NAME_CONTEXT),
    last_name: encryptText(input.last_name, PROFILE_LAST_NAME_CONTEXT),
    hometown: encryptText(input.hometown, PROFILE_HOMETOWN_CONTEXT),
    street_address: encryptText(input.street_address, PROFILE_STREET_ADDRESS_CONTEXT),
    postal_code: encryptText(input.postal_code, PROFILE_POSTAL_CODE_CONTEXT),
    city: encryptText(input.city, PROFILE_CITY_CONTEXT)
  };

  if ("expected_arrival_at" in input) {
    return {
      ...encrypted,
      expected_arrival_at: encryptText(input.expected_arrival_at, PROFILE_EXPECTED_ARRIVAL_CONTEXT)
    };
  }

  return encrypted;
}

export function decryptProfileFields<T extends ProfilePersonalFields | null>(profile: T): T {
  if (!profile) return profile;

  return {
    ...profile,
    first_name: decryptText(profile.first_name, PROFILE_FIRST_NAME_CONTEXT),
    last_name: decryptText(profile.last_name, PROFILE_LAST_NAME_CONTEXT),
    hometown: decryptText(profile.hometown, PROFILE_HOMETOWN_CONTEXT),
    street_address: decryptText(profile.street_address, PROFILE_STREET_ADDRESS_CONTEXT),
    postal_code: decryptText(profile.postal_code, PROFILE_POSTAL_CODE_CONTEXT),
    city: decryptText(profile.city, PROFILE_CITY_CONTEXT),
    expected_arrival_at: decryptText(profile.expected_arrival_at, PROFILE_EXPECTED_ARRIVAL_CONTEXT)
  };
}

export function encryptBeerCrateRegion(value: string | null | undefined) {
  return encryptText(value, BOOKING_BEER_REGION_CONTEXT);
}

export function encryptBookingExpectedArrival(value: string | null | undefined) {
  return encryptText(value, BOOKING_EXPECTED_ARRIVAL_CONTEXT);
}

export function decryptBookingFields<T extends BookingRecord | BookingWithProfile>(booking: T): T {
  return {
    ...booking,
    beer_crate_region: decryptText(booking.beer_crate_region, BOOKING_BEER_REGION_CONTEXT),
    expected_arrival_at: decryptText(booking.expected_arrival_at, BOOKING_EXPECTED_ARRIVAL_CONTEXT),
    ...("profiles" in booking ? { profiles: decryptProfileFields(booking.profiles) } : {})
  };
}

export function encryptGalleryCaption(value: string | null | undefined) {
  return encryptText(value, GALLERY_CAPTION_CONTEXT);
}

export function decryptGalleryPhoto<T extends GalleryPhoto>(photo: T): T {
  return {
    ...photo,
    caption: decryptText(photo.caption, GALLERY_CAPTION_CONTEXT)
  };
}
