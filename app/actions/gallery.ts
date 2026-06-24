"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdmin } from "@/lib/data";
import { uploadGalleryPhotos } from "@/lib/gallery-upload";
import { createClient } from "@/lib/supabase/server";

function text(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

export async function uploadGalleryPhotoAction(formData: FormData) {
  let result;
  try {
    result = await uploadGalleryPhotos(formData);
  } catch (error) {
    console.error("Gallery upload failed", error);
    redirect(`/gallery?error=${encodeURIComponent("Upload fehlgeschlagen. Bitte versuche es mit kleineren Fotos erneut.")}`);
  }

  if (!result.ok) redirect(`/gallery?error=${encodeURIComponent(result.message)}`);

  redirect(`/gallery?message=${encodeURIComponent(result.message)}`);
}

export async function deleteGalleryPhotoAction(formData: FormData) {
  await requireAdmin();

  const photoId = text(formData, "photoId");
  if (!photoId) redirect("/gallery?error=Foto fehlt.");

  const supabase = await createClient();
  const { data: photo, error: loadError } = await supabase
    .from("gallery_photos")
    .select("id, storage_path")
    .eq("id", photoId)
    .maybeSingle();

  if (loadError) redirect(`/gallery?error=${encodeURIComponent(loadError.message)}`);
  if (!photo) redirect("/gallery?error=Foto wurde nicht gefunden.");

  const { error: storageError } = await supabase.storage.from("gallery").remove([photo.storage_path]);
  if (storageError) redirect(`/gallery?error=${encodeURIComponent(storageError.message)}`);

  const { error: deleteError } = await supabase.from("gallery_photos").delete().eq("id", photo.id);
  if (deleteError) redirect(`/gallery?error=${encodeURIComponent(deleteError.message)}`);

  revalidatePath("/gallery");
  revalidatePath("/gallery/slideshow");
  redirect("/gallery?message=Foto gelöscht.");
}
