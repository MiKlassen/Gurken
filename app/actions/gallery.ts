"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getActiveEventForMember, requireCompleteProfile, requireVerifiedUser } from "@/lib/data";
import { createClient } from "@/lib/supabase/server";

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 90);
}

export async function uploadGalleryPhotoAction(formData: FormData) {
  const user = await requireVerifiedUser();
  await requireCompleteProfile(user.id);

  const event = await getActiveEventForMember();
  if (!event) redirect("/gallery?error=Kein aktives Treffen gefunden.");

  const file = formData.get("photo");
  const caption = formData.get("caption");

  if (!(file instanceof File) || file.size === 0) {
    redirect("/gallery?error=Bitte ein Foto auswaehlen.");
  }

  if (!file.type.startsWith("image/")) {
    redirect("/gallery?error=Nur Bilddateien sind erlaubt.");
  }

  if (file.size > 10 * 1024 * 1024) {
    redirect("/gallery?error=Fotos duerfen maximal 10 MB gross sein.");
  }

  const supabase = await createClient();
  const path = `${event.id}/${user.id}/${Date.now()}-${safeFileName(file.name) || "foto"}`;
  const { error: uploadError } = await supabase.storage.from("gallery").upload(path, file, {
    contentType: file.type,
    upsert: false
  });

  if (uploadError) redirect(`/gallery?error=${encodeURIComponent(uploadError.message)}`);

  const { error } = await supabase.from("gallery_photos").insert({
    event_id: event.id,
    user_id: user.id,
    storage_path: path,
    caption: typeof caption === "string" && caption.trim() ? caption.trim() : null
  });

  if (error) redirect(`/gallery?error=${encodeURIComponent(error.message)}`);

  revalidatePath("/gallery");
  revalidatePath("/gallery/slideshow");
  redirect("/gallery?message=Foto ist live.");
}
