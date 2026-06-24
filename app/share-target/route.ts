import { NextResponse } from "next/server";
import { uploadGalleryPhotos } from "@/lib/gallery-upload";

export const dynamic = "force-dynamic";

function redirectToGallery(request: Request, params: Record<string, string>) {
  const url = new URL("/gallery", request.url);
  for (const [key, value] of Object.entries(params)) {
    url.searchParams.set(key, value);
  }

  return NextResponse.redirect(url, 303);
}

export async function GET(request: Request) {
  return redirectToGallery(request, {});
}

export async function POST(request: Request) {
  let result;
  try {
    const formData = await request.formData();
    result = await uploadGalleryPhotos(formData);
  } catch (error) {
    console.error("Share target gallery upload failed", error);
    return redirectToGallery(request, {
      error: "Upload fehlgeschlagen. Bitte versuche es mit kleineren Fotos erneut."
    });
  }

  if (!result.ok) {
    return redirectToGallery(request, { error: result.message });
  }

  return redirectToGallery(request, { message: result.message });
}
