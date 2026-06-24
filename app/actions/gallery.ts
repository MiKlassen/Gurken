"use server";

import { redirect } from "next/navigation";
import { uploadGalleryPhotos } from "@/lib/gallery-upload";

export async function uploadGalleryPhotoAction(formData: FormData) {
  const result = await uploadGalleryPhotos(formData);
  if (!result.ok) redirect(`/gallery?error=${encodeURIComponent(result.message)}`);

  redirect(`/gallery?message=${encodeURIComponent(result.message)}`);
}
