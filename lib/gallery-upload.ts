import { revalidatePath } from "next/cache";
import { getActiveEventForMember, requireCompleteProfile, requireVerifiedUser } from "@/lib/data";
import { encryptGalleryCaption } from "@/lib/personal-data";
import { createClient } from "@/lib/supabase/server";

const MAX_PHOTO_SIZE = 10 * 1024 * 1024;
const MAX_PHOTO_COUNT = 20;

function formText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getCaption(formData: FormData) {
  const caption = formText(formData, "caption") || formText(formData, "text") || formText(formData, "title");
  return caption ? caption.slice(0, 140) : null;
}

function getPhotoFiles(formData: FormData) {
  const values = [...formData.getAll("photos"), ...formData.getAll("photo")];
  return values.filter((value): value is File => value instanceof File && value.size > 0);
}

export async function uploadGalleryPhotos(formData: FormData) {
  const user = await requireVerifiedUser();
  await requireCompleteProfile(user.id);

  const event = await getActiveEventForMember();
  if (!event) return { ok: false, message: "Kein aktives Treffen gefunden.", count: 0 };

  const files = getPhotoFiles(formData);
  if (!files.length) return { ok: false, message: "Bitte mindestens ein Foto auswählen.", count: 0 };
  if (files.length > MAX_PHOTO_COUNT) return { ok: false, message: `Bitte maximal ${MAX_PHOTO_COUNT} Fotos gleichzeitig hochladen.`, count: 0 };

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return { ok: false, message: "Nur Bilddateien sind erlaubt.", count: 0 };
    }

    if (file.size > MAX_PHOTO_SIZE) {
      return { ok: false, message: "Fotos dürfen maximal 10 MB groß sein.", count: 0 };
    }
  }

  const supabase = await createClient();
  const caption = getCaption(formData);
  let encryptedCaption: string | null;
  try {
    encryptedCaption = encryptGalleryCaption(caption);
  } catch (error) {
    return {
      ok: false,
      message: error instanceof Error ? error.message : "Verschlüsselung fehlgeschlagen.",
      count: 0
    };
  }
  const rows = [];

  for (const [index, file] of files.entries()) {
    const path = `${event.id}/${Date.now()}-${index}-${crypto.randomUUID()}`;
    const { error: uploadError } = await supabase.storage.from("gallery").upload(path, file, {
      contentType: file.type,
      upsert: false
    });

    if (uploadError) return { ok: false, message: uploadError.message, count: rows.length };

    rows.push({
      event_id: event.id,
      user_id: user.id,
      storage_path: path,
      caption: encryptedCaption
    });
  }

  const { error } = await supabase.from("gallery_photos").insert(rows);
  if (error) return { ok: false, message: error.message, count: 0 };

  revalidatePath("/gallery");
  revalidatePath("/gallery/slideshow");
  return { ok: true, message: files.length === 1 ? "Foto ist live." : `${files.length} Fotos sind live.`, count: files.length };
}
