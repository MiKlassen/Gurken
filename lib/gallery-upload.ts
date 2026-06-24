import { revalidatePath } from "next/cache";
import { getActiveEventForMember, requireCompleteProfile, requireVerifiedUser } from "@/lib/data";
import { formatMegabytes, MAX_GALLERY_PHOTO_COUNT, MAX_GALLERY_PHOTO_SIZE, MAX_GALLERY_UPLOAD_SIZE } from "@/lib/gallery-limits";
import { encryptGalleryCaption } from "@/lib/personal-data";
import { createClient } from "@/lib/supabase/server";

function formText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function getCaption(formData: FormData) {
  const caption = formText(formData, "caption") || formText(formData, "text") || formText(formData, "title");
  return caption ? caption.slice(0, 140) : null;
}

function isUploadFile(value: FormDataEntryValue): value is File {
  if (typeof value !== "object" || value === null) return false;

  const candidate = value as Partial<File>;
  return (
    typeof candidate.size === "number" &&
    typeof candidate.type === "string" &&
    typeof candidate.arrayBuffer === "function"
  );
}

function getPhotoFiles(formData: FormData) {
  const values = [...formData.getAll("photos"), ...formData.getAll("photo")];
  return values.filter((value): value is File => isUploadFile(value) && value.size > 0);
}

export async function uploadGalleryPhotos(formData: FormData) {
  const user = await requireVerifiedUser();
  await requireCompleteProfile(user.id);

  const event = await getActiveEventForMember();
  if (!event) return { ok: false, message: "Kein aktives Treffen gefunden.", count: 0 };

  const files = getPhotoFiles(formData);
  if (!files.length) return { ok: false, message: "Bitte mindestens ein Foto auswählen.", count: 0 };
  if (files.length > MAX_GALLERY_PHOTO_COUNT) {
    return { ok: false, message: `Bitte maximal ${MAX_GALLERY_PHOTO_COUNT} Fotos gleichzeitig hochladen.`, count: 0 };
  }

  const totalSize = files.reduce((sum, file) => sum + file.size, 0);
  if (totalSize > MAX_GALLERY_UPLOAD_SIZE) {
    return {
      ok: false,
      message: `Bitte maximal ${formatMegabytes(MAX_GALLERY_UPLOAD_SIZE)} pro Upload auswählen.`,
      count: 0
    };
  }

  for (const file of files) {
    if (!file.type.startsWith("image/")) {
      return { ok: false, message: "Nur Bilddateien sind erlaubt.", count: 0 };
    }

    if (file.size > MAX_GALLERY_PHOTO_SIZE) {
      return { ok: false, message: `Fotos dürfen maximal ${formatMegabytes(MAX_GALLERY_PHOTO_SIZE)} groß sein.`, count: 0 };
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
