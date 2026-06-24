"use server";

import { redirect } from "next/navigation";
import { uploadGalleryPhotos } from "@/lib/gallery-upload";

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
